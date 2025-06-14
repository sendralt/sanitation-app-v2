# Task Assignment System Implementation Plan (Revised)

## Overview
This document outlines the implementation plan for an automated task assignment system using a FIFO approach with priority handling. The system will manage sanitation checklist assignments using Docker-based PostgreSQL, track task statuses, handle incomplete tasks, and provide supervisor override capabilities.

## Database Setup with Docker
We'll use Docker to run PostgreSQL. Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  db:
    image: postgres:15
    container_name: sanitation-db
    environment:
      POSTGRES_USER: ${DB_USER:-admin}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-securepassword}
      POSTGRES_DB: ${DB_NAME:-sanitation}
    ports:
      - "5432:5432"
    volumes:
      - sanitation-data:/var/lib/postgresql/data
volumes:
  sanitation-data:
```

Create `.env` file:
```
DB_USER=admin
DB_PASSWORD=securepassword
DB_NAME=sanitation
```

Start the database:
```bash
docker-compose up -d
```

## Database Schema (Sequelize Models)

### Checklist Model
```javascript
module.exports = (sequelize, DataTypes) => {
  const Checklist = sequelize.define('Checklist', {
    id: { type: DataTypes.STRING, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    frequency: { 
      type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
      defaultValue: 'daily'
    },
    defaultPriority: { 
      type: DataTypes.INTEGER,
      defaultValue: 5
    },
    lastGeneratedAt: { type: DataTypes.DATE },
    isActive: { 
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  });
  return Checklist;
};
```

### TaskAssignment Model
```javascript
module.exports = (sequelize, DataTypes) => {
  const TaskAssignment = sequelize.define('TaskAssignment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    checklistId: { type: DataTypes.STRING, allowNull: false },
    status: {
      type: DataTypes.ENUM('pending', 'assigned', 'in_progress', 'completed', 'incomplete_requeued'),
      defaultValue: 'pending'
    },
    queuePosition: { type: DataTypes.BIGINT },
    priority: { type: DataTypes.INTEGER, defaultValue: 5 },
    assignedAt: { type: DataTypes.DATE },
    startedAt: { type: DataTypes.DATE },
    completedAt: { type: DataTypes.DATE },
    isManuallyAssigned: { type: DataTypes.BOOLEAN, defaultValue: false },
    notes: { type: DataTypes.TEXT }
  });

  TaskAssignment.beforeCreate(async (taskAssignment) => {
    // Set initial queue position
  });
  
  return TaskAssignment;
};
```

## Database Configuration
Update Sequelize config to connect to Docker PostgreSQL:
```javascript
// config/database.js
module.exports = {
  dialect: 'postgres',
  host: 'localhost',
  port: 5432,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};
```

## Core Components

### Task Assignment Service
Key methods:
1. `getAndAssignNextTask(workerId)` - Assigns next task based on FIFO and priority
2. `submitTaskAndGetNext(taskAssignmentId, workerId, isComplete, notes)` - Handles task submission
3. `manualAssignTask(checklistId, workerId, priority)` - Supervisor manual assignment

### API Endpoints
- `POST /worker/get-task` - Get next task for worker
- `POST /worker/submit-task` - Submit task completion
- `POST /supervisor/manual-assign` - Manual task assignment

## Implementation Timeline (Revised)

1. **Phase 1: Docker & Database Setup (2-3 days)**  
   - Install Docker
   - Set up PostgreSQL container
   - Configure Sequelize models
   - Seed initial data

2. **Phase 2: Core Logic (5-7 days)**  
   - Implement task assignment service
   - Create API endpoints
   - Add unit tests

3. **Phase 3: Interfaces (3-5 days)**  
   - Develop worker dashboard
   - Implement supervisor manual assignment UI

4. **Phase 4: Task Generation (2-3 days)**  
   - Implement background task generation service
   - Refine concurrency handling

5. **Phase 5: Testing & Deployment (3-5 days)**  
   - End-to-end testing
   - User acceptance testing
   - Deployment to production

## Docker Management
Key commands:
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker logs sanitation-db

# Backup database
docker exec sanitation-db pg_dump -U admin sanitation > backup.sql
```

## Future Enhancements
- Add Redis for queue management
- Implement Prometheus monitoring
- Add database backup automation
- Create Docker Swarm/Kubernetes deployment
