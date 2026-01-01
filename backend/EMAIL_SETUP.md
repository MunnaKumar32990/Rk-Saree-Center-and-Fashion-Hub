# Email Configuration Setup

This document explains how to configure email functionality for the Contact Us form.

## Required Environment Variables

Add the following variables to your `.env` file in the `backend` directory:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_or_password
ADMIN_RECEIVER_EMAIL=admin@example.com
```

## Gmail Setup (Example)

If you're using Gmail:

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password as `EMAIL_PASS`

3. **Configuration**:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_16_character_app_password
   ADMIN_RECEIVER_EMAIL=admin@example.com
   ```

## Other Email Providers

### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your_email@outlook.com
EMAIL_PASS=your_password
ADMIN_RECEIVER_EMAIL=admin@example.com
```

### Yahoo
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USER=your_email@yahoo.com
EMAIL_PASS=your_app_password
ADMIN_RECEIVER_EMAIL=admin@example.com
```

### Custom SMTP Server
```env
EMAIL_HOST=your_smtp_server.com
EMAIL_PORT=587
EMAIL_USER=your_email@domain.com
EMAIL_PASS=your_password
ADMIN_RECEIVER_EMAIL=admin@example.com
```

## Testing

After configuration, test the email functionality by:
1. Starting the backend server
2. Submitting the Contact Us form on the frontend
3. Checking the admin email inbox for the contact form submission

## Troubleshooting

- **Authentication Error**: Verify your email and password are correct
- **Connection Error**: Check your EMAIL_HOST and EMAIL_PORT settings
- **Port 465**: If using port 465, the system will automatically use secure connection
- **Firewall**: Ensure your server can connect to the SMTP server

