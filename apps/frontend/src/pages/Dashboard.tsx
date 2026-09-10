import { useAuth } from '../hooks/useAuth';
import { TeacherDashboard } from '../components/TeacherDashboard';
import { StudentDashboard } from '../components/StudentDashboard';

const Dashboard = () => {
  const { user } = useAuth();
  return user?.role === 'TEACHER' ? <TeacherDashboard /> : <StudentDashboard />;
};

export default Dashboard;
