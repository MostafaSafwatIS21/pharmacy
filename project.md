Here is a comprehensive and technical prompt ready for you to copy and paste to your AI coding agent (like Cursor, GitHub Copilot, or Claude).

It is structured to give the agent a clear architectural starting point for a React application, suggesting standard libraries for the specific tasks (like handling Excel files and printing).

---

**Copy and paste this to your coding agent:**

> "Act as an expert frontend developer. I need you to build a new React application for a lightweight Pharmacy POS and Quotation system.
>
> **Tech Stack Preferences:**
>
> - React (Vite)
> - Tailwind CSS (for fast, clean styling)
> - `xlsx` or `papaparse` (for parsing the imported Excel sheets)
> - `react-to-print` (for handling the Quotation and POS Invoice printing)
> - Lucide React (for icons)
>
> **Project Scope & Rules:**
>
> - **CRUCIAL:** There is absolutely NO inventory or stock management in this app. Do not build any UI for quantities remaining, out-of-stock alerts, or warehouse management.
> - The system relies entirely on a single Excel file upload to populate the items data.
>
> **Please generate the components and UI for the following 4 main screens:**
>
> **1. Data Import Screen:**
>
> - A clean Drag & Drop zone or upload button for an Excel file.
> - Once uploaded, parse the data (Item Name, Details/Description, Price) and store it in the global state.
>
> **2. Items Directory & Advanced Search (Main Dashboard):**
>
> - A data table displaying the imported items.
> - A robust search bar and filter system (by name, type, or other imported attributes).
> - Checkboxes next to each item row so the user can select multiple items to either generate a Quote or make a Sale.
>
> **3. Quotation Generator Screen:**
>
> - Takes the selected items from the directory.
> - Includes 'Data Visibility' toggles (e.g., checkboxes to hide/show specific columns like 'Details' before printing).
> - A clean, professional print layout (Print Layout A) for the quotation, with a 'Print' button.
>
> **4. POS & Sales Invoicing Screen:**
>
> - Takes the selected items for a direct sale.
> - Calculates the Total Price.
> - A distinct print layout (Print Layout B) formatted as a standard customer receipt/invoice, with a 'Print' button.
>
> Please start by initializing the project structure, setting up the layout shell, and building the `Data Import` and `Items Directory` components first."

**\* **A quick tip for the backend integration later:\*\* Since you'll be handling the data logic, having the agent manage the parsed Excel data in React's Context API or a lightweight state manager like Zustand will make it much easier for you to wire up your backend endpoints later!
