import 'dotenv/config';
import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import cors from "cors";
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import fetch from 'node-fetch'; // For fetching from ESP32
import cron from 'node-cron'; // For scheduling

const app = express();
const port = process.env.PORT || 4000;

app.use(bodyParser.json());
app.use(cors());

const mongodb_uri = process.env.MONGODB_URI;
const readingsCollectionName = 'readings';
const usersCollectionName = 'users';
const jwtSecret = 'your-secret-key';
const esp32_ip = process.env.ESP32_IP; // Add ESP32 IP from .env

let dbClient;
let db; // Make db global
let readingsCollection;
let usersCollection;

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.sendStatus(403);
    }
};

async function connectMongoDB() {
    try {
        dbClient = new MongoClient(mongodb_uri);
        await dbClient.connect();
        db = dbClient.db(); // Assign to the global variable
        console.log("Successfully connected to the database server");
        readingsCollection = db.collection(readingsCollectionName);
        usersCollection = db.collection(usersCollectionName);
        console.log('Connected to MongoDB');
        setupRoutes(); // Call setupRoutes after successful connection
        startFetchingReadings(); // Start the cron job
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

const generateToken = (user) => {
    return jwt.sign({ userId: user._id, role: user.role }, jwtSecret, { expiresIn: '1h' });
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, jwtSecret, async (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const findUserById = async (userId) => {
    try {
        return await usersCollection.findOne({ _id: new ObjectId(userId) });
    } catch (error) {
        console.error('Error finding user by ID:', error);
        return null;
    }
};

async function getMonthlyReadingsByIP(ipAddress) {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        return await readingsCollection.find({
            device_ip: ipAddress,
            timestamp: { $gte: startOfMonth, $lte: endOfMonth }
        }).sort({ timestamp: 1 }).toArray();
    } catch (error) {
        console.error(`Error fetching monthly readings for ${ipAddress}:`, error);
        return [];
    }
}

const calculateBilling = (readings) => {
    if (!readings || readings.length === 0) return { totalConsumption: 0, totalBill: 0 };

    const totalConsumption = readings.reduce((sum, r) => sum + parseFloat(r.value || 0), 0);

    let remaining = totalConsumption;
    let totalBill = 0;

    const slabs = [
        { limit: 50, rate: 0.27 },
        { limit: 50, rate: 0.77 },
        { limit: 100, rate: 1.63 },
        { limit: 100, rate: 2.00 },
        { limit: 100, rate: 2.20 },
        { limit: 100, rate: 2.41 },
        { limit: Infinity, rate: 2.48 },
    ];

    for (let slab of slabs) {
        if (remaining <= 0) break;

        const slabUsage = Math.min(remaining, slab.limit);
        totalBill += slabUsage * slab.rate;
        remaining -= slabUsage;
    }

    return {
        totalConsumption: totalConsumption.toFixed(2),
        totalBill: totalBill.toFixed(2),
    };
};

async function getAllReadings() {
    try {
        return await readingsCollection.find().sort({ timestamp: -1 }).toArray();
    } catch (error) {
        console.error('Error fetching all readings:', error);
        return [];
    }
}

// Function to fetch data from ESP32 and save to MongoDB
async function fetchMeterReading() {
    try {
        if (!esp32_ip) {
            console.error('ESP32_IP not configured in .env file.');
            return;
        }
        const response = await fetch(`http://${esp32_ip}/json`);
        if (response.ok) {
            const data = await response.json();
            console.log('Data from ESP32:', data); // ADDED THIS LINE
            if (data && data.main && data.main.value && data.main.timestamp) {
                const reading = {
                    value: parseFloat(data.main.value),
                    timestamp: new Date(data.main.timestamp),
                    raw: data.main.raw,
                    pre: data.main.pre,
                    error: data.main.error,
                    rate: parseFloat(data.main.rate),
                    device_ip: esp32_ip,
                };
                await saveReadingToDatabase(reading);
            } else {
                console.warn('Invalid JSON response from ESP32:', data);
            }
        } else {
            console.error(`Failed to fetch data from ESP32. Status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error fetching data from ESP32:', error);
    }
}

// Function to save reading to MongoDB
async function saveReadingToDatabase(reading) {
    try {
        if (!readingsCollection) {
            console.warn('MongoDB collection not initialized!');
            return; // Stop if the collection is not ready
        }
        const result = await readingsCollection.insertOne(reading, { writeConcern: { w: "majority" } }); // Explicit write concern
        console.log('Reading saved to database. Inserted ID:', result.insertedId);
        console.log('Reading object saved:', reading);
    } catch (error) {
        console.error('Error saving reading:', error);
        console.error('Error details:', error.stack);
        console.error('Reading object that caused error:', reading);
    }
}

// Function to start the cron job
function startFetchingReadings() {
    cron.schedule('* * * * *', async () => { // Every minute
        console.log('Fetching meter reading...');
        await fetchMeterReading();
    });
    console.log('Meter reading scheduled to run every minute.');
}


function setupRoutes() {
    app.post('/api/login', async (req, res) => {
        const { username, password } = req.body;
        const user = await usersCollection.findOne({ username });
        if (user && await bcrypt.compare(password, user.password)) {
            const token = generateToken(user);
            res.json({ token, user: { _id: user._id, username: user.username, role: user.role, assignedDevices: user.assignedDevices } });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    });

    app.post('/api/register', async (req, res) => {
        const { username, password, meterIPs } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required.' });
        }

        const existingUser = await usersCollection.findOne({ username });
        if (existingUser) {
            return res.status(409).json({ message: 'Username already exists.' });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const assignedDevices = Array.isArray(meterIPs) ? meterIPs.map(ip => ip.trim()).filter(ip => ip !== '') : [];
            const newUser = { username, password: hashedPassword, role: 'user', assignedDevices };
            const result = await usersCollection.insertOne(newUser);
            if (result.insertedId) {
                res.status(201).json({ message: 'Registration successful. You can now log in.' });
            } else {
                res.status(500).json({ message: 'Failed to register user.' });
            }
        } catch (error) {
            console.error('Error during registration:', error);
            res.status(500).json({ message: 'Failed to register user.' });
        }
    });

    app.get('/api/dashboard/readings', authenticateToken, async (req, res) => {
        try {
            if (req.user.role === 'admin') {
                const latestReadingsForAll = await readingsCollection.aggregate([
                    {
                        $sort: { timestamp: -1 }
                    },
                    {
                        $group: {
                            _id: '$device_ip',
                            latestReading: { $first: '$$ROOT' }
                        }
                    }
                ]).toArray();
                res.json(latestReadingsForAll);
            } else {
                const user = await findUserById(req.user.userId);
                if (user?.assignedDevices?.length > 0) {
                    const latestReadings = [];
                    for (const deviceIp of user.assignedDevices) {
                        const latestReading = await readingsCollection.findOne(
                            { device_ip: deviceIp },
                            { sort: { timestamp: -1 } }
                        );
                        if (latestReading) {
                            latestReadings.push(latestReading);
                        }
                    }
                    res.json(latestReadings);

                } else {
                    res.status(200).json([]);
                }
            }
        } catch (error) {
            console.error('Error fetching latest reading:', error);
            res.status(500).json({ message: 'Failed to fetch latest reading.' });
        }
    });

    // Get all users (Admin only)
    app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
        try {
            const users = await usersCollection.find({}, { projection: { password: 0 } }).toArray(); // Exclude password
            res.json(users);
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ message: 'Failed to fetch users.' });
        }
    });

    // Create a new user (Admin only)
    app.post('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
        const { username, password, role, assignedDevices } = req.body;
        if (!username || !password || !role) {
            return res.status(400).json({ message: 'Username, password, and role are required.' });
        }

        const existingUser = await usersCollection.findOne({ username });
        if (existingUser) {
            return res.status(409).json({ message: 'Username already exists.' });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = {
                username,
                password: hashedPassword,
                role,
                assignedDevices: assignedDevices || []
            };
            const result = await usersCollection.insertOne(user);
            res.status(201).json({ message: 'User created successfully.', userId: result.insertedId });
        } catch (error) {
            console.error('Error creating user:', error);
            res.status(500).json({ message: 'Failed to create user.' });
        }
    });

    // Add this route to fetch monthly readings
    app.get('/api/dashboard/monthly/:deviceIp', authenticateToken, async (req, res) => {
        const { deviceIp } = req.params;
        try {
            const monthlyReadings = await getMonthlyReadingsByIP(deviceIp);
            const billingInfo = calculateBilling(monthlyReadings);
            res.json({ readings: monthlyReadings, billing: billingInfo });
        } catch (error) {
            console.error(`Error fetching monthly data for ${deviceIp}`, error);
            res.status(500).json({ message: `Failed to fetch monthly data for ${deviceIp}` });
        }
    });
}

connectMongoDB(); // Connect to MongoDB
app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
});

process.on('SIGINT', async () => {
    console.log('Closing MongoDB connection...');
    if (dbClient) await dbClient.close();
    process.exit();
});
