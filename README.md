# Student Result Management System 🎓

A lightweight, cloud-based web application that automates the calculation and publishing of student examination results. Built using **Google Apps Script**, **HTML/CSS**, and **Google Sheets** as a dynamic backend database.

## 🚀 Features
* **Real-Time Search:** Students can securely fetch their marksheet using their Roll Number and Date of Birth.
* **Automated Calculations:** Automatically computes Total Marks (out of 400), Percentages, Subject Grades (A+, A, B, etc.), and Overall Divisions.
* **Smart Grading Rules:** Flags a student as `FAILED` if they score below 35 in any single subject, regardless of their total aggregate.
* **Cloud Database:** Uses Google Sheets as a live database. Any edits made by faculty in the sheet reflect instantly on the live website.
* **One-Click Print:** Built-in PDF saving and printing functionality for official marksheets.

## 🛠️ Tech Stack
* **Backend:** Google Apps Script (`Code.gs`)
* **Frontend:** HTML5, CSS3, Vanilla JavaScript (`index.html`)
* **Database:** Google Sheets

## 📂 Project Structure
* `Code.gs`: The backend controller that handles API requests, database searching, date normalization, and grading algorithms.
* `index.html`: The responsive frontend UI featuring the search portal and dynamic marksheet renderer.

## ⚙️ How to Deploy (For Teachers/Admins)
1. Create a blank Google Sheet.
2. Go to **Extensions > Apps Script**.
3. Paste `Code.gs` and `index.html` into the editor.
4. Select the `setupSheet` function in the toolbar and click **Run** to automatically generate the database columns and sample student records.
5. Click **Deploy > New deployment > Web App** (Set access to 'Anyone').

## 👨‍💻 Team Members
* Sanjay V R
* Trisha Pradhan
* Varshini S
* Gangothri J R
* Pavin kumar R
* Mallikarjun chekuri
  

*Developed for the Data Structures Course (E1CSA25479) at Alliance University.*
