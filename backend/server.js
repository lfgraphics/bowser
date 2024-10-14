const express = require('express');
const Tesseract = require('tesseract.js');
// const axios = require('axios');
const cors = require('cors');
// const fs = require('fs');
const sharp = require('sharp');

// importants
const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use((req, res, next) => {
    console.log("middleware ran")
    next()
})
// const tessdataPath = './';

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

// endpoints
app.get("/", (req, res) => {
    res.send("landing page")
})

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

app.post('/formsubmit', async (req, res) => {
    const { vehicleNumberPlateImage, vehicleNumber, driverName, driverId, driverMobile, fuelMeterImage, fuelQuantity, gpsLocation, fuelingDateTime } = req.body;
    try {
        res.send('Details Submitted Successfully');
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send('Server Error');
    }
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}, reStarted at ${new Date().toLocaleString()}`);
});