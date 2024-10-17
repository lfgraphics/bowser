const express = require('express');
const Tesseract = require('tesseract.js');
const cors = require('cors');
const sharp = require('sharp');
require('dotenv').config();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// importants
const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json({ limit: '50mb' }));  // Increase the limit to 50MB
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());
app.use(bodyParser.json());
app.use((req, res, next) => {
    console.log("middleware ran")
    next()
})

// connection
const bowsersDatabaseConnection = mongoose.createConnection(process.env.BowsersDataConnectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 35000
});

bowsersDatabaseConnection.on('connected', () => {
    console.log('Connected to BowsersData MongoDB');
});

bowsersDatabaseConnection.on('error', (error) => {
    console.error('BowsersData MongoDB connection error:', error);
});

const transportDatabaseConnection = mongoose.createConnection(process.env.TransportDataConnectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 35000
});

transportDatabaseConnection.on('connected', () => {
    console.log('Connected to TransportDataHn MongoDB');
});

transportDatabaseConnection.on('error', (error) => {
    console.error('TransportDataHn MongoDB connection error:', error);
});


// schemas
const formDataSchema = new mongoose.Schema({
    vehicleNumberPlateImage: String,
    vehicleNumber: String,
    driverName: String,
    driverId: String,
    driverMobile: String,
    fuelMeterImage: String,
    fuelQuantity: String,
    gpsLocation: String,
    fuelingDateTime: String
});
const FormData = bowsersDatabaseConnection.model('FormData', formDataSchema, 'FuelingRecordsCollection');
const driverSchema = new mongoose.Schema({
    Name: String,
    ITPLId: String,
    MobileNo: [{
        MobileNo: String,
        IsDefaultNumber: Boolean,
        LastUsed: Boolean
    }]
});
const Driver = transportDatabaseConnection.model('Driver', driverSchema, 'DriversCollection');

// endpoints
app.get("/", (req, res) => {
    res.send("landing page")
})

app.post('/formsubmit', async (req, res) => {
    try {
        const formData = new FormData(req.body);
        
        // Increase the write concern timeout
        const saveOptions = { 
            writeConcern: { 
                w: 'majority', 
                wtimeout: 30000 // 30 seconds timeout
            }
        };
        
        // Use a promise with a timeout
        const savePromise = formData.save(saveOptions);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Save operation timed out')), 35000) // 35 seconds timeout
        );

        await Promise.race([savePromise, timeoutPromise]);
        
        res.status(200).json({ message: 'Data Submitted successfully' });
    } catch (err) {
        console.error('Error saving form data:', err);
        
        if (err.message === 'Save operation timed out') {
            res.status(503).json({
                message: 'The database operation timed out. Please try again later.',
                error: 'Database timeout'
            });
        } else if (err.name === 'MongooseError' && err.message.includes('buffering timed out')) {
            res.status(503).json({
                message: 'The database is currently unavailable. Please try again later.',
                error: 'Database connection timeout'
            });
        } else {
            res.status(500).json({
                message: 'An error occurred while saving the form data',
                error: err.message
            });
        }
    }
});
app.get('/searchDriver/:searchTerm', async (req, res) => {
    const searchTerm = req.params.searchTerm;

    try {
        console.log('Attempting to search for drivers with term:', searchTerm);
        const Driver = transportDatabaseConnection.model('Driver', driverSchema, 'DriversCollection');
        const drivers = await Driver.find({
            $or: [
                { Name: { $regex: searchTerm, $options: 'i' } },
                { ITPLId: { $regex: searchTerm, $options: 'i' } },
                { 'MobileNo.MobileNo': { $regex: searchTerm, $options: 'i' } }
            ]
        }).exec();

        console.log('Search completed. Found', drivers.length, 'drivers');

        if (drivers.length === 0) {
            return res.status(404).json({ message: 'No driver found with the given search term' });
        }

        res.status(200).json(drivers);
    } catch (err) {
        console.error('Error searching drivers:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
    }
});

// functions
// Function to preprocess the image (convert to grayscale)
async function preprocessImage(imageBuffer) {
    return await sharp(imageBuffer)
        .grayscale()
        .toFormat('png')
        .toBuffer();
}
// Function to post-process the extracted text
function postProcessText(text) {
    // Remove any non-alphanumeric characters except spaces
    text = text.replace(/[^A-Z0-9\s]/g, '');

    // Ensure proper spacing
    text = text.replace(/\s+/g, ' ').trim();

    // Validate format (assuming format like "21 BH 2345 AA")
    const match = text.match(/(\d{2})\s?([A-Z]{2})\s?(\d{4})\s?([A-Z]{2})/);
    if (match) {
        return `${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
    }

    return text; // Return original if format doesn't match
}
// Main function to convert image URI to text
async function convertImageToText(imageUri) {
    try {
        console.log("Image to Text Conversion using Tesseract OCR");

        // Fetch the image from the URI
        const response = await fetch(imageUri);
        if (!response.ok) {
            throw new Error('Failed to fetch image from URI');
        }

        // Convert the response to a buffer
        const imageBuffer = await response.buffer();

        // Preprocess the image (if needed, modify as per your implementation)
        const processedImageBuffer = await preprocessImage(imageBuffer);

        // Create a worker for Tesseract
        const worker = Tesseract.createWorker({
            logger: info => console.log(info) // Optional logger to see progress
        });

        await worker.load();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');

        // Set the character whitelist for recognition
        await worker.setParameters({
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '
        });

        // Use Tesseract to recognize text from the preprocessed image
        const { data: { text } } = await worker.recognize(processedImageBuffer);

        console.log("Extracted Text: " + text.trim());

        // Post-process the extracted text
        const numberPlate = postProcessText(text);
        console.log("Processed Number Plate: " + numberPlate);

        // Save the processed number plate to a file
        console.log('output text', numberPlate);
        // console.log("Text saved to output.txt");
        await worker.terminate();
        return numberPlate
    } catch (error) {
        console.error("An error occurred: " + error.message);
    }
}
app.post("/imageprocessing", async (req, res) => {
    const { image } = req.body;
    if (!image) {
        console.error('No imageUri provided');
        return res.status(400).send('Image URI is required');
    }

    // Set headers for streaming response
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const processedImageBuffer = await preprocessImage(imageBuffer);

        // Create a worker for Tesseract
        const worker = Tesseract.createWorker({
            logger: info => {
                console.log(info);
                // Send progress updates to the client
                res.write(JSON.stringify({ progress: info }) + '\n');
            }
        });

        await worker.load();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');

        const { data: { text } } = await worker.recognize(processedImageBuffer, {
            lang: 'eng', // Specify the language
            logger: info => console.log(info) // Optional logger to see progress
        });
        const processedText = postProcessText(text);

        // Send the final processed text to the client
        res.write(JSON.stringify({ text: processedText }) + '\n');
        res.end(); // End the response

        await worker.terminate();
    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).send('Error processing image');
    }
});

Promise.all([
    new Promise(resolve => bowsersDatabaseConnection.once('connected', resolve)),
    new Promise(resolve => transportDatabaseConnection.once('connected', resolve))
]).then(() => {
    console.log('Both database connections established');
    // Define your models here
    const Driver = transportDatabaseConnection.model('Driver', driverSchema, 'DriversCollection');
    // ... other models ...

    // Start your server here
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}, reStarted at ${new Date().toLocaleString()}`);
    });
}).catch(error => {
    console.error('Failed to connect to databases:', error);
    process.exit(1);
});