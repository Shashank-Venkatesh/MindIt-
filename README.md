# MindIt!

MindIt! is a web application that transforms raw documents (PDFs, DOCX, etc.) into structured, easy-to-read notes. Users upload their study or work materials, and the system processes them using AI to generate organized summaries, key points, and structured notes.

## Features

- **Document Upload** – Securely upload documents (PDF, DOCX, TXT, etc.) with support for large files via object storage.
- **AI-Powered Note Generation** – Automatically extract key concepts, headings, and summaries from uploaded documents using LLMs.
- **Structured Notes** – View and manage clean, well-organized notes generated from your documents.
- **User Authentication** – Secure sign-up, login, and account management with JWT-based authentication.
- **Document Management** – Organize, search, and access your documents and notes in one place.
- **Responsive UI** – Modern, fast, and mobile-friendly interface built with React, Tailwind CSS, and Framer Motion.

## Tech Stack

### Frontend
- **React** – Component-based UI library for building interactive interfaces.
- **Tailwind CSS** – Utility-first CSS framework for rapid, consistent styling.
- **Framer Motion** – Animation library for smooth transitions and micro-interactions.

### Backend
- **FastAPI** – High-performance Python web framework for building the REST API.
- **PostgreSQL** – Relational database for storing users, documents, notes, and metadata.
- **SQLAlchemy / SQLModel** – ORM for clean, type-safe database interactions.
- **Pydantic** – Data validation and settings management using Python type hints.
- **S3-Compatible Object Storage** – Scalable storage for uploaded documents (e.g., AWS S3, Cloudflare R2).

### AI & Processing
- **LLM Integration** – Integration with hosted LLM APIs (e.g., OpenAI, Anthropic) for text summarization and structuring.
- **Document Parsing** – Libraries for extracting text and structure from PDFs, DOCX, and other formats.
- **Background Workers** – Asynchronous processing pipeline for document parsing and note generation.

## Architecture Overview

MindIt! follows a modular, layered architecture:

- **API Layer (FastAPI Routers)** – Handles HTTP requests, authentication, and request/response validation.
- **Business Logic Layer (Services)** – Contains core application logic, including document processing and LLM integration.
- **Data Access Layer (Repositories)** – Manages database queries and interactions with PostgreSQL.
- **Core Module** – Configuration, database connection, security utilities, and logging.
- **Workers** – Background processes for heavy tasks like document parsing and AI inference.

This separation ensures maintainability, testability, and scalability as the project grows.

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+ and npm/yarn
- PostgreSQL 14+
- S3-compatible storage credentials (e.g., AWS S3, Cloudflare R2)
- LLM API key (e.g., OpenAI, Anthropic)

### Backend Setup

1. Clone the repository and navigate to the backend directory.
2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Configure environment variables (`.env`):
   - Database URL
   - S3/R2 credentials and bucket name
   - LLM API key
   - JWT secret and other security settings
4. Initialize the database and run migrations.
5. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables for API endpoints.
4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and visit the local development URL.

## Project Status

MindIt! is currently in active development. Core features including authentication, document upload, and AI-powered note generation are being implemented.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit your changes (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a Pull Request.

## License

This project is licensed under the MIT License.

## Contact


For questions or feedback, please reach out via the repository's issue tracker or contact the maintainer directly.
=======
If you want to understand the app quickly, trace the flow from raw text input to chunking, then to embeddings, then to topic clusters, and finally to the nested RAG output.
=======
# MindIt!
