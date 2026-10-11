#include <iostream>
#include <vector>
#include <string>
#include <iomanip>
#include <algorithm>

using namespace std;

// Structure to hold student data
struct Student {
    int rollNo;
    string dob;
    string name;
    int math, science, english, computer;
    int total;
    float percentage;
    string status;
};

// Function to compute total, percentage, and pass/fail status
void calculateResult(Student &s) {
    s.total = s.math + s.science + s.english + s.computer;
    s.percentage = (s.total / 400.0) * 100.0;
    
    // Check if marks >= 35 in ALL subjects
    if (s.math >= 35 && s.science >= 35 && s.english >= 35 && s.computer >= 35) {
        s.status = (s.percentage >= 75.0) ? "PASSED WITH DISTINCTION" : "PASSED";
    } else {
        s.status = "FAILED";
    }
}

// Function to print the marksheet
void displayStudent(const Student &s) {
    cout << "\n==================================================\n";
    cout << "           ALLIANCE UNIVERSITY MARKSHEET          \n";
    cout << "==================================================\n";
    cout << "Name: " << s.name << "\nRoll No: " << s.rollNo << "\nDOB: " << s.dob << "\n";
    cout << "--------------------------------------------------\n";
    cout << left << setw(15) << "Subject" << setw(15) << "Max Marks" << "Marks Obtained\n";
    cout << "--------------------------------------------------\n";
    cout << left << setw(15) << "Mathematics" << setw(15) << "100" << s.math << "\n";
    cout << left << setw(15) << "Science"     << setw(15) << "100" << s.science << "\n";
    cout << left << setw(15) << "English"     << setw(15) << "100" << s.english << "\n";
    cout << left << setw(15) << "Computer"    << setw(15) << "100" << s.computer << "\n";
    cout << "--------------------------------------------------\n";
    cout << "Aggregate: " << s.total << " / 400 | Percentage: " 
         << fixed << setprecision(2) << s.percentage << "%\n";
    cout << "Result Status: " << s.status << "\n";
    cout << "==================================================\n";
}

int main() {
    // Initialize test database matching the Web App
    vector<Student> database = {
        {101, "2005-06-15", "Aarav Sharma", 92, 88, 85, 95, 0, 0.0, ""},
        {102, "2005-08-22", "Priya Patel", 78, 82, 74, 86, 0, 0.0, ""},
        {103, "2005-11-03", "Rohan Verma", 64, 59, 68, 71, 0, 0.0, ""},
        {104, "2005-02-14", "Sneha Nair", 95, 96, 91, 98, 0, 0.0, ""},
        {105, "2005-09-30", "Vikram Singh", 42, 28, 51, 49, 0, 0.0, ""}
    };

    // Pre-calculate results for all students
    for (auto &s : database) {
        calculateResult(s);
    }

    int choice;
    do {
        cout << "\n--- Student Result Management System ---\n";
        cout << "1. Search Student Result\n2. View Rank List\n3. Exit\nEnter your choice: ";
        cin >> choice;

        if (choice == 1) {
            int searchRoll;
            string searchDob;
            cout << "Enter Roll Number: "; 
            cin >> searchRoll;
            cout << "Enter Date of Birth (YYYY-MM-DD): "; 
            cin >> searchDob;
            
            // Linear Search algorithm
            bool found = false;
            for (const auto &s : database) {
                if (s.rollNo == searchRoll && s.dob == searchDob) {
                    displayStudent(s);
                    found = true;
                    break;
                }
            }
            if (!found) cout << "\n[!] Error: Invalid Roll Number or Date of Birth.\n";
            
        } else if (choice == 2) {
            // Sorting algorithm to rank students by Total Marks
            vector<Student> sortedDb = database;
            sort(sortedDb.begin(), sortedDb.end(), [](const Student &a, const Student &b) {
                return a.total > b.total;
            });
            
            cout << "\n--- MERIT RANK LIST ---\n";
            for (size_t i = 0; i < sortedDb.size(); i++) {
                cout << i + 1 << ". " << left << setw(15) << sortedDb[i].name 
                     << "| Roll: " << sortedDb[i].rollNo 
                     << " | Score: " << sortedDb[i].total << "/400 (" 
                     << sortedDb[i].percentage << "%)\n";
            }
        }
    } while (choice != 3);

    return 0;
}
