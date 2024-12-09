import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import fs from "fs"; // Node.js module to handle file system
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// storage pdf
const storagePdfFile = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Change IMAGE_FOLDER_LOCATION to PDF_FOLDER_LOCATION or any desired folder
  },
  filename: (req, file, cb) => {
    // renaming the pdf file to have the 'date' and the original file name
    cb(null, file.originalname);
  },
});

// filter pdf types
const filterPdfFile = (req, file, cb) => {
  if (file.mimetype === "application/pdf") cb(null, true);
  else cb("Only .pdf format allowed!", false);
};

// Pdf File Upload Middleware
const uploadPdfFile = multer({
  storage: storagePdfFile,
  fileFilter: filterPdfFile,
  // limits: { fieldSize: 10000000000 }
});

app.get("/", (req, res) => {
  res.send("server is healthy");
});

app.post(
  "/result",
  uploadPdfFile.single("file"),
  async function (req, res, next) {
    try {
      if (!req.file) {
        res.status(400).json({ message: "file not found" });
      }
      if (!req.body.weeklyChargesBand) {
        res.status(400).json({ message: "weeklyChargesBand not found" });
      }

      // File path to the file you want to upload
      const filePath = `./uploads/${req.file.originalname}`;

      // Weekly Charges Band data
      const weeklyChargesBand = req.body.weeklyChargesBand;

      const formData = new FormData();
      formData.append("file", fs.createReadStream(filePath)); // Attach the file
      formData.append("weeklyChargesBand", weeklyChargesBand); // Attach weeklyChargesBand

      // Axios request configuration
      const config = {
        method: "post",
        url: process.env.NEXT_PUBLIC_SERVER_URL,
        headers: {
          ...formData.getHeaders(), // Automatically adds proper headers for multipart form data
        },
        data: formData,
      };

      const { data } = await axios(config);
      console.log(data);
      const responses = await Promise.all([
        fetch(process.env.NEXT_PUBLIC_DOMESTIC_ACCESORIALS_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: data.file_name_1,
            weeklyChargesBand: data.exactWeeklyBandRange,
          }),
        }),
        fetch(process.env.NEXT_PUBLIC_DOMESTIC_GROUND_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: data.file_name_1,
            weeklyChargesBand: data.exactWeeklyBandRange,
          }),
        }),
  
        fetch(process.env.NEXT_PUBLIC_INTERNATIONAL_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: data.file_name_2,
            weeklyChargesBand: data.exactWeeklyBandRange,
          }),
        }),
      ]);
  
      const responseJson = await Promise.all(
        responses.map((response) => response.json())
      );
  
      console.log(responseJson);

      res.json(responseJson);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "server error", error: error });
    }
  }
);

const PORT = process.env.PORT || 2001;
app.listen(PORT, () => {
  console.log(` listening on port ${PORT}`);
});
