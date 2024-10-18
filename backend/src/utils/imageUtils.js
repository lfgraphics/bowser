const sharp = require('sharp');

async function preprocessImage(imageBuffer) {
    return await sharp(imageBuffer)
        .grayscale()
        .toFormat('png')
        .toBuffer();
}

function postProcessText(text) {
    text = text.replace(/[^A-Z0-9\s]/g, '');
    text = text.replace(/\s+/g, ' ').trim();
    const match = text.match(/(\d{2})\s?([A-Z]{2})\s?(\d{4})\s?([A-Z]{2})/);
    if (match) {
        return `${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
    }
    return text;
}

module.exports = {
    preprocessImage,
    postProcessText
};