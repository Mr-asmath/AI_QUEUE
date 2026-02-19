from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here-change-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///queue_system.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

CORS(app, supports_credentials=True)
db = SQLAlchemy(app)

# Database Models
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='user')
    phone = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Token(db.Model):
    __tablename__ = 'tokens'
    id = db.Column(db.Integer, primary_key=True)
    token_number = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    status = db.Column(db.String(20), default='waiting')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    called_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    user = db.relationship('User', foreign_keys=[user_id])
    doctor = db.relationship('User', foreign_keys=[doctor_id])

class Suggestion(db.Model):
    __tablename__ = 'suggestions'
    id = db.Column(db.Integer, primary_key=True)
    token_id = db.Column(db.Integer, db.ForeignKey('tokens.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    suggestion_text = db.Column(db.Text, nullable=False)
    medicines = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)
    
    token = db.relationship('Token')
    doctor = db.relationship('User', foreign_keys=[doctor_id])

class QueueStatus(db.Model):
    __tablename__ = 'queue_status'
    id = db.Column(db.Integer, primary_key=True)
    current_token = db.Column(db.Integer, default=0)
    last_token = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class QueueHistory(db.Model):
    __tablename__ = 'queue_history'
    id = db.Column(db.Integer, primary_key=True)
    token_number = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token_id = db.Column(db.Integer, db.ForeignKey('tokens.id'), nullable=True)
    message = db.Column(db.String(500), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Create tables
with app.app_context():
    db.create_all()
    
    # Create default admin if not exists
    if not User.query.filter_by(role='admin').first():
        admin = User(
            name='Admin',
            email='admin@queue.com',
            role='admin'
        )
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.commit()
        print("Default admin created - Email: admin@queue.com, Password: admin123")
    
    # Create default doctor if not exists
    if not User.query.filter_by(role='doctor').first():
        doctor = User(
            name='Dr. Smith',
            email='doctor@queue.com',
            role='doctor'
        )
        doctor.set_password('doctor123')
        db.session.add(doctor)
        db.session.commit()
        print("Default doctor created - Email: doctor@queue.com, Password: doctor123")
    
    # Initialize queue status if not exists
    if not QueueStatus.query.first():
        initial_status = QueueStatus(current_token=0, last_token=0)
        db.session.add(initial_status)
        db.session.commit()
        print("Queue status initialized")

# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'success': False, 'error': 'Please login first'}), 401
        return f(*args, **kwargs)
    return decorated_function

def role_required(roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                return jsonify({'success': False, 'error': 'Please login first'}), 401
            user = User.query.get(session['user_id'])
            if not user or user.role not in roles:
                return jsonify({'success': False, 'error': 'Unauthorized access'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Helper function to calculate estimated waiting time
def calculate_waiting_time(current_token, target_token):
    if target_token <= current_token:
        return 0
    return (target_token - current_token) * 5

# Helper function to create notification
def create_notification(user_id, message, notification_type, token_id=None):
    notification = Notification(
        user_id=user_id,
        token_id=token_id,
        message=message,
        type=notification_type
    )
    db.session.add(notification)
    db.session.commit()

# Authentication APIs
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.json
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        phone = data.get('phone')
        role = data.get('role', 'user')
        
        if User.query.filter_by(email=email).first():
            return jsonify({'success': False, 'error': 'Email already registered'}), 400
        
        user = User(
            name=name,
            email=email,
            role=role,
            phone=phone
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'role': user.role
            }
        }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        user = User.query.filter_by(email=email).first()
        
        if not user or not user.check_password(password):
            return jsonify({'success': False, 'error': 'Invalid email or password'}), 401
        
        session['user_id'] = user.id
        session['user_role'] = user.role
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'role': user.role
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logout successful'}), 200

@app.route('/api/auth/me', methods=['GET'])
@login_required
def get_current_user():
    user = User.query.get(session['user_id'])
    return jsonify({
        'success': True,
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'role': user.role
        }
    }), 200

# Token APIs
@app.route('/api/token', methods=['POST'])
@login_required
def generate_token():
    try:
        user_id = session['user_id']
        user = User.query.get(user_id)
        
        existing_token = Token.query.filter_by(
            user_id=user_id, 
            status='waiting'
        ).first()
        
        if existing_token:
            return jsonify({
                'success': False, 
                'error': 'You already have a waiting token'
            }), 400
        
        queue_status = QueueStatus.query.first()
        new_token_number = queue_status.last_token + 1
        
        token = Token(
            token_number=new_token_number,
            user_id=user_id,
            status='waiting'
        )
        db.session.add(token)
        
        queue_status.last_token = new_token_number
        
        history = QueueHistory(
            token_number=new_token_number,
            user_id=user_id,
            action='created'
        )
        db.session.add(history)
        
        db.session.commit()
        
        waiting_time = calculate_waiting_time(queue_status.current_token, new_token_number)
        
        # Notify admins and doctors
        admins = User.query.filter_by(role='admin').all()
        doctors = User.query.filter_by(role='doctor').all()
        for admin in admins:
            create_notification(
                admin.id,
                f'New token #{new_token_number} generated by {user.name}',
                'token_generated',
                token.id
            )
        for doctor in doctors:
            create_notification(
                doctor.id,
                f'New patient in queue: Token #{new_token_number} - {user.name}',
                'new_patient',
                token.id
            )
        
        return jsonify({
            'success': True,
            'token': new_token_number,
            'waiting_time': waiting_time,
            'position': new_token_number - queue_status.current_token
        }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/queue/status', methods=['GET'])
def get_queue_status():
    try:
        queue_status = QueueStatus.query.first()
        
        waiting_tokens = Token.query.filter_by(status='waiting').count()
        with_doctor_tokens = Token.query.filter_by(status='with_doctor').count()
        
        next_tokens = Token.query.filter_by(status='waiting')\
            .order_by(Token.token_number)\
            .limit(5)\
            .all()
        
        next_tokens_list = [{
            'token_number': t.token_number,
            'user_name': t.user.name,
            'user_id': t.user.id,
            'created_at': t.created_at.strftime('%H:%M:%S')
        } for t in next_tokens]
        
        current_token_data = None
        if queue_status.current_token > 0:
            current_token = Token.query.filter_by(
                token_number=queue_status.current_token
            ).first()
            if current_token:
                current_token_data = {
                    'token_number': current_token.token_number,
                    'user_name': current_token.user.name,
                    'status': current_token.status,
                    'doctor_name': current_token.doctor.name if current_token.doctor else None
                }
        
        if waiting_tokens > 0:
            next_token = Token.query.filter_by(status='waiting')\
                .order_by(Token.token_number)\
                .first()
            waiting_time = calculate_waiting_time(
                queue_status.current_token, 
                next_token.token_number
            )
        else:
            waiting_time = 0
        
        return jsonify({
            'success': True,
            'current_token': queue_status.current_token,
            'current_token_data': current_token_data,
            'last_token': queue_status.last_token,
            'waiting_count': waiting_tokens,
            'with_doctor_count': with_doctor_tokens,
            'estimated_waiting_time': waiting_time,
            'next_tokens': next_tokens_list,
            'is_active': queue_status.is_active
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Doctor APIs
@app.route('/api/doctor/patients', methods=['GET'])
@login_required
@role_required(['doctor', 'admin'])
def get_patients_for_doctor():
    try:
        waiting_patients = Token.query.filter_by(status='waiting')\
            .order_by(Token.token_number)\
            .all()
        
        with_doctor = Token.query.filter_by(status='with_doctor')\
            .order_by(Token.token_number)\
            .all()
        
        today_start = datetime.now().replace(hour=0, minute=0, second=0)
        completed = Token.query.filter(
            Token.status == 'completed',
            Token.completed_at >= today_start
        ).order_by(Token.completed_at.desc()).limit(10).all()
        
        patients_list = {
            'waiting': [{
                'token_id': t.id,
                'token_number': t.token_number,
                'user_id': t.user.id,
                'user_name': t.user.name,
                'user_email': t.user.email,
                'created_at': t.created_at.strftime('%H:%M:%S'),
                'waiting_time': calculate_waiting_time(
                    QueueStatus.query.first().current_token,
                    t.token_number
                )
            } for t in waiting_patients],
            
            'with_doctor': [{
                'token_id': t.id,
                'token_number': t.token_number,
                'user_id': t.user.id,
                'user_name': t.user.name,
                'doctor_name': t.doctor.name if t.doctor else None,
                'called_at': t.called_at.strftime('%H:%M:%S') if t.called_at else None
            } for t in with_doctor],
            
            'completed': [{
                'token_number': t.token_number,
                'user_name': t.user.name,
                'completed_at': t.completed_at.strftime('%H:%M:%S') if t.completed_at else None
            } for t in completed]
        }
        
        return jsonify({
            'success': True,
            'patients': patients_list
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/doctor/call-patient/<int:token_id>', methods=['PUT'])
@login_required
@role_required(['doctor', 'admin'])
def call_patient_to_doctor(token_id):
    try:
        doctor_id = session['user_id']
        token = Token.query.get(token_id)
        
        if not token or token.status != 'waiting':
            return jsonify({
                'success': False,
                'error': 'Patient not available'
            }), 400
        
        token.status = 'with_doctor'
        token.doctor_id = doctor_id
        token.called_at = datetime.utcnow()
        
        queue_status = QueueStatus.query.first()
        if token.token_number > queue_status.current_token:
            queue_status.current_token = token.token_number
        
        history = QueueHistory(
            token_number=token.token_number,
            user_id=token.user_id,
            action='called_to_doctor'
        )
        db.session.add(history)
        
        db.session.commit()
        
        create_notification(
            token.user_id,
            f'Token #{token.token_number} - Doctor is ready to see you. Please proceed to the consultation room.',
            'token_called',
            token.id
        )
        
        return jsonify({
            'success': True,
            'message': f'Patient with token #{token.token_number} called',
            'token': token.token_number,
            'user_name': token.user.name
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/doctor/add-suggestion', methods=['POST'])
@login_required
@role_required(['doctor', 'admin'])
def add_suggestion():
    try:
        data = request.json
        doctor_id = session['user_id']
        token_id = data.get('token_id')
        suggestion_text = data.get('suggestion_text')
        medicines = data.get('medicines')
        notes = data.get('notes')
        
        token = Token.query.get(token_id)
        if not token or token.status != 'with_doctor':
            return jsonify({
                'success': False,
                'error': 'Invalid token or patient not with doctor'
            }), 400
        
        suggestion = Suggestion(
            token_id=token_id,
            doctor_id=doctor_id,
            suggestion_text=suggestion_text,
            medicines=json.dumps(medicines) if medicines else None,
            notes=notes
        )
        db.session.add(suggestion)
        
        db.session.commit()
        
        create_notification(
            token.user_id,
            f'Doctor has added suggestions for your visit. Please check your suggestions.',
            'suggestion_added',
            token.id
        )
        
        return jsonify({
            'success': True,
            'message': 'Suggestion added successfully',
            'suggestion_id': suggestion.id
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/doctor/complete-patient/<int:token_id>', methods=['PUT'])
@login_required
@role_required(['doctor', 'admin'])
def complete_patient(token_id):
    try:
        token = Token.query.get(token_id)
        
        if not token or token.status != 'with_doctor':
            return jsonify({
                'success': False,
                'error': 'Patient not with doctor'
            }), 400
        
        token.status = 'completed'
        token.completed_at = datetime.utcnow()
        
        history = QueueHistory(
            token_number=token.token_number,
            user_id=token.user_id,
            action='completed'
        )
        db.session.add(history)
        
        db.session.commit()
        
        create_notification(
            token.user_id,
            f'Your consultation is complete. Thank you for visiting!',
            'consultation_complete',
            token.id
        )
        
        return jsonify({
            'success': True,
            'message': 'Patient consultation completed'
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Admin APIs
@app.route('/api/admin/queue/next', methods=['PUT'])
@login_required
@role_required(['admin'])
def call_next_token_admin():
    try:
        queue_status = QueueStatus.query.first()
        
        next_token = Token.query.filter_by(status='waiting')\
            .order_by(Token.token_number)\
            .first()
        
        if not next_token:
            return jsonify({
                'success': False,
                'error': 'No tokens in queue'
            }), 404
        
        queue_status.current_token = next_token.token_number
        
        next_token.status = 'called'
        next_token.called_at = datetime.utcnow()
        
        history = QueueHistory(
            token_number=next_token.token_number,
            user_id=next_token.user_id,
            action='called'
        )
        db.session.add(history)
        
        db.session.commit()
        
        create_notification(
            next_token.user_id,
            f'Token #{next_token.token_number} is now being called. Please proceed to the counter.',
            'token_called',
            next_token.id
        )
        
        return jsonify({
            'success': True,
            'current_token': queue_status.current_token,
            'called_token': next_token.token_number,
            'user_name': next_token.user.name
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/queue/reset', methods=['POST'])
@login_required
@role_required(['admin'])
def reset_queue():
    try:
        waiting_tokens = Token.query.filter_by(status='waiting').all()
        for token in waiting_tokens:
            token.status = 'cancelled'
            token.completed_at = datetime.utcnow()
            
            history = QueueHistory(
                token_number=token.token_number,
                user_id=token.user_id,
                action='reset'
            )
            db.session.add(history)
            
            create_notification(
                token.user_id,
                f'The queue has been reset. Please generate a new token.',
                'queue_reset',
                token.id
            )
        
        queue_status = QueueStatus.query.first()
        queue_status.current_token = 0
        queue_status.last_token = 0
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Queue reset successfully',
            'reset_tokens': len(waiting_tokens)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# User APIs
@app.route('/api/user/my-tokens', methods=['GET'])
@login_required
def get_my_tokens():
    try:
        user_id = session['user_id']
        tokens = Token.query.filter_by(user_id=user_id)\
            .order_by(Token.created_at.desc())\
            .limit(10)\
            .all()
        
        token_list = [{
            'token_id': t.id,
            'token_number': t.token_number,
            'status': t.status,
            'created_at': t.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'called_at': t.called_at.strftime('%H:%M:%S') if t.called_at else None,
            'completed_at': t.completed_at.strftime('%H:%M:%S') if t.completed_at else None,
            'doctor_name': t.doctor.name if t.doctor else None
        } for t in tokens]
        
        return jsonify({
            'success': True,
            'tokens': token_list
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/my-suggestions', methods=['GET'])
@login_required
def get_my_suggestions():
    try:
        user_id = session['user_id']
        
        suggestions = Suggestion.query\
            .join(Token, Token.id == Suggestion.token_id)\
            .filter(Token.user_id == user_id)\
            .order_by(Suggestion.created_at.desc())\
            .all()
        
        suggestion_list = [{
            'id': s.id,
            'token_number': s.token.token_number,
            'doctor_name': s.doctor.name,
            'suggestion_text': s.suggestion_text,
            'medicines': json.loads(s.medicines) if s.medicines else [],
            'notes': s.notes,
            'created_at': s.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'is_read': s.is_read
        } for s in suggestions]
        
        return jsonify({
            'success': True,
            'suggestions': suggestion_list
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/notifications', methods=['GET'])
@login_required
def get_notifications():
    try:
        user_id = session['user_id']
        notifications = Notification.query.filter_by(user_id=user_id)\
            .order_by(Notification.created_at.desc())\
            .limit(20)\
            .all()
        
        notification_list = [{
            'id': n.id,
            'message': n.message,
            'type': n.type,
            'is_read': n.is_read,
            'created_at': n.created_at.strftime('%H:%M:%S')
        } for n in notifications]
        
        return jsonify({
            'success': True,
            'notifications': notification_list
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/notifications/mark-read/<int:notification_id>', methods=['PUT'])
@login_required
def mark_notification_read(notification_id):
    try:
        notification = Notification.query.get(notification_id)
        if notification and notification.user_id == session['user_id']:
            notification.is_read = True
            db.session.commit()
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)