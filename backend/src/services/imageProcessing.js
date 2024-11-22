const Tesseract = require('tesseract.js');
const { preprocessImage, postProcessText } = require('../utils/imageUtils');

async function processImage(image, res) {
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const processedImageBuffer = await preprocessImage(imageBuffer);

    const worker = Tesseract.createWorker({
        logger: info => {
            console.log(info);
            res.write(JSON.stringify({ progress: info }) + '\n');
        }
    });

    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');

    const { data: { text } } = await worker.recognize(processedImageBuffer, {
        lang: 'eng',
        logger: info => console.log(info)
    });
    const processedText = postProcessText(text);

    res.write(JSON.stringify({ text: processedText }) + '\n');
    res.end();

    await worker.terminate();
}

module.exports = { processImage };