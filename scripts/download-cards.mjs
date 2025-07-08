import axios from "axios";
import fs from "fs";
import path from "path";

const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "0", "J", "Q", "K"];
const suits = ["S", "D", "C", "H"];
const cards = [];

for (const suit of suits) {
  for (const rank of ranks) {
    cards.push(`${rank}${suit}`);
  }
}

const publicDir = path.resolve(process.cwd(), "public/cards");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

async function downloadImages() {
  console.log(`Downloading ${cards.length} card images...`);
  for (const card of cards) {
    const url = `https://deckofcardsapi.com/static/img/${card}.png`;
    const imagePath = path.resolve(publicDir, `${card}.png`);
    try {
      const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
      });

      const writer = fs.createWriteStream(imagePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
      // console.log(`Downloaded ${card}.png`);
    } catch (error) {
      console.error(`Failed to download ${card}.png`);
    }
  }
  console.log("Card images downloaded.");

  // Also download card back
  console.log("Downloading card back...");
  const backUrl = `https://deckofcardsapi.com/static/img/back.png`;
  const backPath = path.resolve(publicDir, `back.png`);
  try {
    const response = await axios({
      url: backUrl,
      method: "GET",
      responseType: "stream",
    });
    const writer = fs.createWriteStream(backPath);
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
    console.log(`Downloaded back.png`);
  } catch (error) {
    console.error(`Failed to download back.png`);
  }
}

downloadImages();
