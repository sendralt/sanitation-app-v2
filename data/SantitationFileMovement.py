#Created By: Jacob
#File Path: /var/www/sanitation-app/backend/SanitationFileMovement.py
#Creation Date:1/14/25
#Version:1.0
#Description: Used to send the sanitation files from the previous day through email to be able to put into sharepoint

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import os
from datetime import datetime, timedelta

# Specify the directory
directory = '/var/www/sanitation-app/backend/data/'

# Get the current date and the date for the previous day
today = datetime.today()
yesterday = today - timedelta(days=1)

# Convert yesterday's date to a timestamp range (midnight to 11:59 PM)
start_of_day = datetime(yesterday.year, yesterday.month, yesterday.day)
end_of_day = datetime(yesterday.year, yesterday.month, yesterday.day, 23, 59, 59)

# Initialize an empty list to store the file paths
attachments_paths = []

# List files in the directory
for filename in os.listdir(directory):
    file_path = os.path.join(directory, filename)

    # Check if it's a file
    if os.path.isfile(file_path):
        # Get the file creation time (Unix timestamp)
        modified_time = os.path.getmtime(file_path)
        
        # Convert creation time to datetime
        file_creation_time = datetime.fromtimestamp(modified_time)
        
        # Check if the file was created yesterday
        if start_of_day <= file_creation_time <= end_of_day:
            # Add the file to the list
            attachments_paths.append(file_path)

# Now `files` contains the list of file paths created yesterday
print(attachments_paths)


# Set up email details
sender_email = "dymc.sanitation@gmail.com"
receiver_email = "louthan.jl@pg.com"
subject = "Sanitation Checklists Files"
body = "Attached are the sanitation checklists files for the previous day"

# Create the email object
message = MIMEMultipart()
message["From"] = sender_email
message["To"] = receiver_email
message["Subject"] = subject

# Add the body of the email
message.attach(MIMEText(body, "plain"))

# Attach the files
attachment_paths = attachments_paths

for attachment_path in attachment_paths:
    attachment = open(attachment_path, "rb")
    part = MIMEBase("application", "octet-stream")
    part.set_payload((attachment).read())
    encoders.encode_base64(part)
    part.add_header("Content-Disposition", f"attachment; filename= {attachment_path.split('/')[-1]}")
    message.attach(part)

# Connect to the SMTP server and send the email
smtp_server = "smtp.gmail.com"
smtp_port = 587

with smtplib.SMTP(smtp_server, smtp_port) as server:
    server.starttls()
    server.login(sender_email, "cdpe gmue aicf hkud")  # Replace with your password or use app-specific passwords
    server.send_message(message)

