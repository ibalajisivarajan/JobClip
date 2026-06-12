import { ResumeManager } from '@/components/ResumeManager';

export default function ProfilePage() {
  return (
    <section>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-950">My Profile</h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage your master resumes. The default resume is used when tailoring to a job posting.
        </p>
      </div>
      <ResumeManager />
    </section>
  );
}
