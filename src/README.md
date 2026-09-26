# Mergington High School API

A FastAPI application for extracurricular activities and school announcements.

## Features

- View all available extracurricular activities
- Sign up for activities
- Display current announcements and manage them as a signed-in teacher

## Getting Started

1. Install the dependencies:

   ```
   pip install fastapi uvicorn
   ```

2. Run the application:

   ```
   python app.py
   ```

3. Open your browser and go to:
   - API documentation: http://localhost:8000/docs
   - Alternative documentation: http://localhost:8000/redoc

## API Endpoints

| Method | Endpoint                                                          | Description                                                          |
| ------ | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| GET    | `/activities`                                                     | Get all activities with their details and current participant count  |
| POST   | `/activities/{activity_name}/signup?email=student@mergington.edu` | Sign up for an activity as the signed-in teacher                     |
| POST   | `/auth/login`                                                     | Sign in with a JSON body (`username`, `password`) and receive an HttpOnly session cookie |
| GET    | `/announcements`                                                  | Get announcements within their start and expiration dates            |
| GET    | `/announcements/manage`                                           | List all announcements (session cookie required)                     |
| POST   | `/announcements`                                                  | Create an announcement (session cookie required)                     |
| PUT    | `/announcements/{announcement_id}`                                | Update an announcement (session cookie required)                     |
| DELETE | `/announcements/{announcement_id}`                                | Delete an announcement (session cookie required)                     |
| GET    | `/auth/check-session`                                             | Validate the current session cookie and return the signed-in teacher |
| POST   | `/auth/logout`                                                    | Revoke the current session cookie                                    |

Announcement create and update requests use JSON with a `message` (up to 1,000 characters), a required `expiration_date` (`YYYY-MM-DD`), and an optional `start_date` (`YYYY-MM-DD`). The start date must not be after the expiration date. Protected endpoints use the same-origin HttpOnly session cookie set by `/auth/login`. Announcements are stored in MongoDB; initialization adds an example announcement when that collection is empty.

## Data Model

The application uses a simple data model with meaningful identifiers:

1. **Activities** - Uses activity name as identifier:

   - Description
   - Schedule
   - Maximum number of participants allowed
   - List of student emails who are signed up

2. **Students** - Uses email as identifier:
   - Name
   - Grade level

Application data is stored in MongoDB.
