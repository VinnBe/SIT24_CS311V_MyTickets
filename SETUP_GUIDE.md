1. Create a virtual environment

---On Ubuntu/Linux/Mac:

bash
python3 -m venv venv
source venv/bin/activate

--- On Windows:

#bash:
python -m venv venv
venv\Scripts\activate

Once activated, you'll see (venv) at the start of your terminal prompt.

--- Common Ubuntu error: if it complains about missing ensure pip/python3-venv, run:

#bash:
sudo apt install python3-venv

then redo this step.

2. Install dependencies
#bash: 
pip install -r requirements.txt

This installs the exact same Flask + PyMySQL versions the team is using — no need to guess what to install.

3. Create your own config.py (database credentials)

This file is not included in the repo (it's blocked by .gitignore because it contains a password).

Create a file named config.py in the project root with this content (ask the team's member for the real host/user/password privately):

python
DB_CONFIG = {
    "host": "<ask team lead>",
    "port": 4000,
    "user": "<ask team lead>",
    "password": "<ask team lead>",
    "database": "test",
}

WARNING: Never push config.py to Git. It's already in .gitignore — leave it that way, don't force-add it.

4. Run the server
#bash
python3 app.py

If it works, you'll see Running on http://127.0.0.1:5000 and the terminal will stay there (it won't return to the $ prompt) — that's expected, it means the server is running. Leave this tab open.

5. Test the connection

Open another terminal tab, then run:

#bash
curl http://127.0.0.1:5000/customers

If you see a JSON list of customers (Nguyen Van A, Tran Thi B, Le Van C...) — your machine is successfully connected to the shared TiDB Cloud database, and you're ready to start coding.

All reads/writes go to the same database on TiDB Cloud - no more exporting/importing .sql files between machines.
