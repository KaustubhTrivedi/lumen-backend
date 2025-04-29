import requests
import json
import datetime
import random
from datetime import timedelta

# --- Configuration ---
BASE_URL = "http://localhost:3000"  # Your NestJS API base URL
LOGIN_ENDPOINT = f"{BASE_URL}/auth/login"
TASKS_ENDPOINT = f"{BASE_URL}/tasks"

# --- User Credentials ---
# Replace with the email and password of the user you want to create tasks for
USER_EMAIL = "kaus12tri@gmail.com" # CHANGE THIS
USER_PASSWORD = "02101999_Mypw"   # CHANGE THIS

# --- Task Data ---
SAMPLE_TASKS = [
    {"title": "Review Project Proposal", "description": "Check proposal draft for Project Phoenix."},
    {"title": "Schedule Team Sync", "description": "Find a time for the weekly team meeting."},
    {"title": "Draft Q2 Report", "description": "Start drafting the quarterly performance report."},
    {"title": "Prepare Presentation Slides", "description": "Create slides for the client demo."},
    {"title": "Grocery Shopping", "description": "Buy milk, eggs, bread, and vegetables."},
    {"title": "Book Flight Tickets", "description": "Book flights for the conference in June."},
    {"title": "Call Plumber", "description": "Follow up on the leaky faucet repair estimate."},
    {"title": "Pay Electricity Bill", "description": "Due by the end of the week."},
    {"title": "Research Competitors", "description": "Analyze features of main competitors."},
    {"title": "Plan Weekend Trip", "description": "Decide destination and book accommodation."},
]

# --- Helper Functions ---

def login_user(email, password):
    """Logs in the user and returns the JWT access token."""
    login_payload = {"email": email, "password": password}
    headers = {"Content-Type": "application/json"}
    try:
        response = requests.post(LOGIN_ENDPOINT, headers=headers, data=json.dumps(login_payload))
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
        token_data = response.json()
        print(f"Login successful for {email}.")
        return token_data.get("access_token")
    except requests.exceptions.RequestException as e:
        print(f"Login failed for {email}: {e}")
        if e.response is not None:
            try:
                print(f"Server response: {e.response.json()}")
            except json.JSONDecodeError:
                print(f"Server response (non-JSON): {e.response.text}")
        return None

def create_task(token, task_data):
    """Creates a single task using the provided JWT token."""
    if not token:
        print("Cannot create task: No authentication token provided.")
        return None

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}" # Include the JWT token
    }
    try:
        response = requests.post(TASKS_ENDPOINT, headers=headers, data=json.dumps(task_data))
        response.raise_for_status()
        created_task = response.json()
        print(f"Successfully created task: '{task_data.get('title')}' (ID: {created_task.get('id')})")
        return created_task
    except requests.exceptions.RequestException as e:
        print(f"Failed to create task '{task_data.get('title')}': {e}")
        if e.response is not None:
            try:
                print(f"Server response: {e.response.json()}")
            except json.JSONDecodeError:
                print(f"Server response (non-JSON): {e.response.text}")
        return None

def generate_random_due_date():
    """Generates a random due date within the next 30 days or makes it overdue."""
    days_offset = random.randint(-5, 30) # Allow some overdue tasks
    due_date = datetime.datetime.now(datetime.timezone.utc) + timedelta(days=days_offset)
    # Add random time
    due_date += timedelta(hours=random.randint(0, 23), minutes=random.randint(0, 59))
    return due_date.isoformat() # Return in ISO 8601 format

# --- Main Script ---

if __name__ == "__main__":
    print("--- Task Generation Script ---")

    # 1. Login and get token
    access_token = login_user(USER_EMAIL, USER_PASSWORD)

    if access_token:
        print("\n--- Creating Tasks ---")
        # 2. Loop through sample tasks and create them
        for i, task_info in enumerate(SAMPLE_TASKS):
            task_payload = {
                "title": task_info["title"],
                "description": task_info["description"],
            }
            # Add a due date to most tasks, leave some without
            if random.random() < 0.8: # 80% chance of having a due date
                 task_payload["dueDate"] = generate_random_due_date()

            create_task(access_token, task_payload)
            # Optional: Add a small delay if needed
            # import time
            # time.sleep(0.1)

        print("\n--- Task creation process finished. ---")
    else:
        print("\nTask creation skipped due to login failure.")

