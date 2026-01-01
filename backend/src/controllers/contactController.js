import nodemailer from "nodemailer";

// @desc Send contact form email
// @route POST /api/contact/send
// @access Public
export const sendContactEmail = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate input
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Check if email configuration exists
    if (
      !process.env.EMAIL_HOST ||
      !process.env.EMAIL_PORT ||
      !process.env.EMAIL_USER ||
      !process.env.EMAIL_PASS ||
      !process.env.ADMIN_RECEIVER_EMAIL
    ) {
      console.error("Email configuration missing in environment variables");
      return res.status(500).json({
        success: false,
        message: "Email service is not configured. Please contact the administrator.",
      });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: process.env.EMAIL_PORT === "465", // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Verify transporter configuration
    await transporter.verify();

    // Email content
    const mailOptions = {
      from: `"RK Saree Center Contact Form" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_RECEIVER_EMAIL,
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #7c3aed; margin-top: 0;">New Contact Form Submission</h2>
            <div style="margin-top: 20px;">
              <p style="margin: 10px 0;"><strong style="color: #374151;">Name:</strong> <span style="color: #6b7280;">${name}</span></p>
              <p style="margin: 10px 0;"><strong style="color: #374151;">Email:</strong> <span style="color: #6b7280;">${email}</span></p>
              <p style="margin: 10px 0;"><strong style="color: #374151;">Subject:</strong> <span style="color: #6b7280;">${subject}</span></p>
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
              <p style="margin: 10px 0;"><strong style="color: #374151;">Message:</strong></p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-top: 10px;">
                <p style="color: #4b5563; white-space: pre-wrap; margin: 0;">${message}</p>
              </div>
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                This email was sent from the RK Saree Center & Fashion Store contact form.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
New Contact Form Submission

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
This email was sent from the RK Saree Center & Fashion Store contact form.
      `,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: "Your message has been sent successfully. We'll get back to you soon!",
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("Error sending email:", error);

    // Handle specific error cases
    if (error.code === "EAUTH") {
      return res.status(500).json({
        success: false,
        message: "Email authentication failed. Please contact the administrator.",
      });
    }

    if (error.code === "ECONNECTION" || error.code === "ETIMEDOUT") {
      return res.status(500).json({
        success: false,
        message: "Unable to connect to email server. Please try again later.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to send email. Please try again later.",
    });
  }
};

