import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f5f5f5'
    }}>
      <SignUp />
    </div>
  );
}