import json
import os

DB_FILE = "parts_db.json"

def load_db():
    """Loads the parts database."""
    if not os.path.exists(DB_FILE):
        return {"motors": [], "batteries": [], "escs": [], "weapons": [], "connectors": []}
    with open(DB_FILE, "r") as f:
        return json.load(f)

def save_db(db):
    """Saves the parts database."""
    with open(DB_FILE, "w") as f:
        json.dump(db, f, indent=4)

def add_part(category, part_data):
    """Adds a new part to the database."""
    db = load_db()
    if category not in db:
        db[category] = []
    db[category].append(part_data)
    save_db(db)

def get_part_names(category):
    """Returns a list of part names for a category."""
    db = load_db()
    return [p["name"] for p in db.get(category, [])]

def get_part_by_name(category, name):
    """Returns the part data for a given name."""
    db = load_db()
    for part in db.get(category, []):
        if part["name"] == name:
            return part
    return None
