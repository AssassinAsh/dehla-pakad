import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export async function POST(request) {
  try {
    const body = await request.json();

    // Validate required fields
    const { feedback } = body;
    if (!feedback || feedback.trim().length === 0) {
      return Response.json({ error: "Feedback is required" }, { status: 400 });
    }

    // Initialize Google Sheets API
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(
      process.env.GOOGLE_SHEET_ID,
      serviceAccountAuth,
    );
    await doc.loadInfo();

    // Get the first sheet (or create if doesn't exist)
    let sheet = doc.sheetsByIndex[0];
    if (!sheet) {
      sheet = await doc.addSheet({
        title: "Feedback",
        headerValues: ["Timestamp", "Name", "Email", "Feedback"],
      });
    }

    // Prepare row data
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const rowData = {
      Timestamp: timestamp,
      Name: body.name || "Anonymous",
      Email: body.email || "",
      Feedback: body.feedback.trim(),
    };

    // Add row to sheet
    await sheet.addRow(rowData);

    return Response.json(
      {
        success: true,
        message: "Thank you for your feedback!",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error submitting feedback:", error);

    return Response.json(
      {
        error: "Failed to submit feedback. Please try again.",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
