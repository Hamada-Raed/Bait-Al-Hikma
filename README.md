# Dar-Al-ill (دار العلم)

<div align="center">
  <img src="docs/images/logo.png" alt="Dar-Al-ill Logo" width="200"/>
  
  **Your Gateway to Quality Education**
  
  [![React](https://img.shields.io/badge/React-19.2.0-blue.svg)](https://reactjs.org/)
  [![Django](https://img.shields.io/badge/Django-5.2.8-green.svg)](https://www.djangoproject.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-blue.svg)](https://www.typescriptlang.org/)
</div>

## 📖 About

**Dar-Al-ill** (دار العلم), maneing "House of Knowledge" in Arabic, is a comprehensive educational platform designed to transform the learning experience by connecting students with expert teachers in a personalized, flexible, and engaging environment.

### What We Offer

Dar-Al-ill serves as a bridge between learners and educators, providing a complete ecosystem for online education. Whether you're a school student seeking help with your curriculum, a university student looking to supplement your studies, or an educator wanting to share your expertise, our platform offers the tools and resources you need to excel.

#### For Students

- **Personalized Learning Paths**: Courses tailored to your grade level, country, track, and major
- **Flexible Scheduling**: Learn at your own pace with courses designed to fit your schedule
- **Interactive Content**: Engage with multimedia courses, video lessons, and interactive quizzes
- **Private Tutoring**: Book one-on-one sessions with qualified teachers based on your availability
- **Progress Tracking**: Monitor your learning journey and achievements as you complete courses

#### For Teachers

- **Course Creation Tools**: Build comprehensive courses with chapters, videos, and quizzes
- **Availability Management**: Set your schedule and let students book private lessons
- **Student Engagement**: Track student progress and provide personalized feedback
- **Flexible Pricing**: Set your own rates for private lessons based on your expertise
- **Approval System**: Quality-controlled course creation ensures high educational standards

#### For Administrators

- **Platform Management**: Oversee all courses, users, and content
- **Quality Control**: Review and approve courses before they go live
- **User Management**: Manage student and teacher accounts
- **Analytics**: Monitor platform usage and educational outcomes

### Key Differentiators

- 🌍 **Multi-language Support**: Fully bilingual interface in English and Arabic with RTL support
- 🎯 **Personalized Experience**: Content adapted to your educational level, country, and learning path
- 📚 **Comprehensive Curriculum**: From school subjects to university majors, we cover all educational levels
- 👥 **Community-Driven**: Connect with fellow students and teachers in a supportive learning community
- 🔒 **Quality Assured**: All courses go through an approval process to ensure educational excellence

## 📸 Screenshots

### Homepage
![Homepage](docs/images/homepage.png)
*Beautiful landing page with hero section, features, and call-to-action*

### Dashboard
![Dashboard](docs/images/dashboard.png)
*Role-specific dashboards for students, teachers, and administrators*

### Course Creation
![Course Creation](docs/images/create-course.png)
*Intuitive interface for teachers to create and manage courses*

### Course Preview
![Course Preview](docs/images/course-preview.png)
*Interactive course viewer with chapters, videos, and quizzes*

### Availability Calendar
![Availability Calendar](docs/images/availability-calendar.png)
*Teachers can set their availability and students can book private lessons*

### Quiz Interface
![Quiz Interface](docs/images/quiz.png)
*Interactive quizzes with images and multiple question types*

### Profile Management
![Profile](docs/images/profile.png)
*Comprehensive user profiles with educational information*

## 🚀 Features

- **Course Management**: Create, manage, and enroll in courses
- **Quiz System**: Interactive quizzes with images and questions
- **Private Lessons**: Book one-on-one sessions with teachers
- **Availability Calendar**: Teachers can set their availability for bookings
- **Multi-language Support**: English and Arabic interface
- **User Roles**: Admin, Teacher, and Student dashboards
- **Profile Management**: User profiles with country, grade, and track information
- **Course Approval**: Admin approval system for course creation

## 🛠️ Tech Stack

### Backend
- **Django 5.2.8**: Web framework
- **Django REST Framework**: API development
- **SQLite**: Database (development)
- **Pillow**: Image processing
- **django-cors-headers**: CORS handling

### Frontend
- **React 19.2.0**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **React Router**: Navigation
- **React Scripts**: Build tooling

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

## 🔧 Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (if not already created):
```bash
python -m venv venv
```

3. Activate the virtual environment:
   - **Windows**:
     ```bash
     venv\Scripts\activate
     ```
   - **macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Run migrations:
```bash
python manage.py migrate
```

6. Create a superuser (optional):
```bash
python manage.py createsuperuser
```

7. Populate lookup tables (optional):
```bash
python manage.py populate_lookup_tables
```

8. Start the development server:
```bash
python manage.py runserver
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

## 📁 Project Structure

```
Dar-Al-ill/
├── backend/                 # Django backend
│   ├── api/                # Main application
│   │   ├── models.py       # Database models
│   │   ├── views.py        # API views
│   │   ├── serializers.py # DRF serializers
│   │   ├── urls.py         # URL routing
│   │   └── migrations/     # Database migrations
│   ├── backend/            # Django project settings
│   ├── media/              # User-uploaded files
│   ├── manage.py           # Django management script
│   └── requirements.txt    # Python dependencies
│
└── frontend/               # React frontend
    ├── src/
    │   ├── components/     # React components
    │   ├── contexts/       # React contexts (Auth, Language)
    │   ├── utils/          # Utility functions
    │   └── App.tsx         # Main app component
    ├── public/             # Static files
    └── package.json        # Node dependencies
```

## 🗄️ Database Models

Key models include:
- **User**: Custom user model with profile information
- **Course**: Course management with chapters and videos
- **Quiz**: Quiz system with questions
- **Availability**: Teacher availability and booking system
- **PrivateLessonPrice**: Pricing for private lessons
- **Country/Grade/Track/Major**: Lookup tables for educational structure

## 🔐 Authentication

The platform uses Django's authentication system with custom user models. Users can:
- Sign up as students or teachers
- Login with credentials
- Access role-based dashboards

## 🌐 API Endpoints

The backend provides REST API endpoints for:
- User authentication and registration
- Course CRUD operations
- Quiz management
- Availability and booking management
- Profile management
- Admin operations

## 🎨 Frontend Components

- **Header/Footer**: Navigation and site information
- **Hero/Features/WhyChooseUs**: Landing page sections
- **Dashboard**: Role-specific dashboards (Admin, Teacher, Student)
- **CreateCourse**: Course creation interface
- **ManageCourse**: Course management
- **AvailabilityCalendar**: Teacher availability management
- **Profile**: User profile management
- **Login/SignUp**: Authentication forms

## 🚀 Deployment

### Backend
1. Set `DEBUG = False` in `settings.py`
2. Configure `ALLOWED_HOSTS`
3. Set up a production database (PostgreSQL recommended)
4. Configure static file serving
5. Set up environment variables for sensitive data

### Frontend
1. Build the production bundle:
```bash
npm run build
```
2. Serve the `build` directory using a web server (nginx, Apache, etc.)

## 📝 Development Notes

- The backend uses SQLite for development (change to PostgreSQL for production)
- CORS is configured for local development
- Media files are stored in the `media/` directory
- Migrations should be run after pulling new changes

## 📷 Adding Screenshots

To add screenshots to this README:

1. Create a `docs/images/` directory in the project root:
   ```bash
   mkdir -p docs/images
   ```

2. Add your screenshots to the `docs/images/` directory with the following names:
   - `logo.png` - Platform logo
   - `homepage.png` - Homepage screenshot
   - `dashboard.png` - Dashboard screenshot
   - `create-course.png` - Course creation interface
   - `course-preview.png` - Course preview page
   - `availability-calendar.png` - Availability calendar
   - `quiz.png` - Quiz interface
   - `profile.png` - User profile page

3. The images will automatically appear in the README above.

**Note**: You can also add more screenshots by updating the image paths in the README.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

[Add your license here]

## 👥 Authors

[Add author information here]

## 🙏 Acknowledgments

[Add any acknowledgments here]

