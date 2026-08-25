-- 1. Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('MASTER_ADMIN', 'CSR', 'DISPATCHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE personnel_type AS ENUM ('TECHNICIAN', 'OSP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('ACTIVE', 'DEACTIVATED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_type AS ENUM ('INSTALL', 'REPAIR', 'BACKJOB', 'RELOCATION', 'PULL_OUT', 'MAINLINE', 'ADD_NAP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM (
      'NEW', 'RELEASED', 'ASSIGNED', 'IN_PROGRESS', 
      'DELAYED', 'ON_HOLD', 'REASSIGNMENT_REQUESTED', 
      'COMPLETED', 'ACKNOWLEDGED', 'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE plan_type AS ENUM ('88MBPS', '120MBPS', '250MBPS', '500MBPS', '1GBPS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reassignment_status AS ENUM ('PENDING', 'APPROVED', 'DENIED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reassignment_resolution AS ENUM ('SAME_TEAM', 'REASSIGNED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE config_list_type AS ENUM ('TASK_TYPE', 'ISSUE', 'PLAN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. System Users (Admin, CSR, Dispatcher)
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    username_or_email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    contact_number VARCHAR(50),
    status user_status DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Technicians & OSP Registry
CREATE TABLE IF NOT EXISTS technicians_osp (
    tech_id VARCHAR(50) PRIMARY KEY, -- Format: T-XXXX or OSP-XXXX
    full_name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(50) NOT NULL,
    personnel_type personnel_type NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    must_change_password BOOLEAN DEFAULT TRUE,
    status user_status DEFAULT 'ACTIVE',
    registered_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Teams & Rosters
CREATE TABLE IF NOT EXISTS teams (
    team_id SERIAL PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_members (
    team_id INTEGER REFERENCES teams(team_id) ON DELETE CASCADE,
    tech_id VARCHAR(50) REFERENCES technicians_osp(tech_id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, tech_id)
);

-- 5. Core Tasks
CREATE TABLE IF NOT EXISTS tasks (
    task_id VARCHAR(20) PRIMARY KEY, -- Format: YYYYMMDD-###
    task_type task_type NOT NULL,
    status task_status DEFAULT 'NEW',
    account_number VARCHAR(50),
    client_password VARCHAR(50),
    client_id VARCHAR(50),
    client_name VARCHAR(255),
    address TEXT,
    issue VARCHAR(255),
    landmark TEXT,
    is_unverified BOOLEAN DEFAULT FALSE,
    created_by_id VARCHAR(100) NOT NULL,
    created_by_role VARCHAR(50) NOT NULL,
    released_by UUID REFERENCES users(user_id),
    released_at TIMESTAMP WITH TIME ZONE,
    assigned_team_id INTEGER REFERENCES teams(team_id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by_tech_id VARCHAR(50) REFERENCES technicians_osp(tech_id),
    resolution_note TEXT,
    acknowledged_by UUID REFERENCES users(user_id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    cancelled_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Install Details
CREATE TABLE IF NOT EXISTS task_install_details (
    task_id VARCHAR(20) PRIMARY KEY REFERENCES tasks(task_id) ON DELETE CASCADE,
    contact_name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(50) NOT NULL,
    plan plan_type NOT NULL,
    referral TEXT
);

-- 7. Task Notes
CREATE TABLE IF NOT EXISTS task_notes (
    note_id SERIAL PRIMARY KEY,
    task_id VARCHAR(20) REFERENCES tasks(task_id) ON DELETE CASCADE,
    author_id VARCHAR(100) NOT NULL,
    author_role VARCHAR(50) NOT NULL,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Task Photos (Google Drive links)
CREATE TABLE IF NOT EXISTS task_photos (
    photo_id SERIAL PRIMARY KEY,
    task_id VARCHAR(20) REFERENCES tasks(task_id) ON DELETE CASCADE,
    drive_file_id VARCHAR(255) NOT NULL,
    drive_url TEXT NOT NULL,
    uploaded_by_tech_id VARCHAR(50) REFERENCES technicians_osp(tech_id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Task Audit History
CREATE TABLE IF NOT EXISTS task_history (
    history_id SERIAL PRIMARY KEY,
    task_id VARCHAR(20) REFERENCES tasks(task_id) ON DELETE CASCADE,
    actor_id VARCHAR(100) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    remarks TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Reassignment Requests
CREATE TABLE IF NOT EXISTS reassignment_requests (
    request_id SERIAL PRIMARY KEY,
    task_id VARCHAR(20) REFERENCES tasks(task_id) ON DELETE CASCADE,
    requested_by_tech_id VARCHAR(50) REFERENCES technicians_osp(tech_id),
    reason TEXT NOT NULL,
    status reassignment_status DEFAULT 'PENDING',
    resolved_by UUID REFERENCES users(user_id),
    resolution reassignment_resolution,
    new_team_id INTEGER REFERENCES teams(team_id),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 11. System Configuration Lists
CREATE TABLE IF NOT EXISTS system_config_lists (
    config_id SERIAL PRIMARY KEY,
    list_type config_list_type NOT NULL,
    value VARCHAR(255) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);