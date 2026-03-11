import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { uploadImage } from "./cloudinary.js";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generatePoster = async (donorName: string, bloodGroup: string, date: Date) => {
  const htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: 'Arial', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #fce4e4; }
          .card { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
          .title { color: #dc2626; font-size: 32px; font-weight: bold; margin-bottom: 10px; }
          .subtitle { color: #4b5563; font-size: 18px; margin-bottom: 30px; }
          .blood-group { background: #dc2626; color: white; width: 100px; height: 100px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 40px; font-weight: bold; margin: 0 auto 20px; }
          .name { font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 5px; }
          .date { color: #6b7280; font-size: 14px; }
          .footer { margin-top: 30px; font-size: 12px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="title">Blood Fighter</div>
          <div class="subtitle">Thank you for saving lives!</div>
          <div class="blood-group">${bloodGroup}</div>
          <div class="name">${donorName}</div>
          <div class="date">Donated on: ${new Date(date).toLocaleDateString()}</div>
          <div class="footer">#BloodFighters #DonateBlood</div>
        </div>
      </body>
    </html>
  `;

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(htmlContent);
  await page.setViewport({ width: 600, height: 800 });
  
  const tempPath = path.join(__dirname, `../../uploads/poster-${Date.now()}.png`);
  
  // Ensure uploads directory exists
  if (!fs.existsSync(path.join(__dirname, '../../uploads'))) {
    fs.mkdirSync(path.join(__dirname, '../../uploads'), { recursive: true });
  }

  await page.screenshot({ path: tempPath });
  await browser.close();

  // Upload to Cloudinary
  const posterUrl = await uploadImage(tempPath, "blood-fighters/posters");
  return posterUrl;
};
