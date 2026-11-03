import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

interface ProfileSetupProps {
  userId: string;
  onComplete: () => void;
}

export default function ProfileSetup({
  userId,
  onComplete,
}: ProfileSetupProps) {

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    // Extract values from the form
    const form = new FormData(event.currentTarget);

    const get = (field: string) =>
      String(form.get(field) ?? '').trim();

    const year = Number(get('year_of_study'));

    if (!Number.isInteger(year) || year < 1 || year > 7) {
      setError('Enter a valid year of study.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Insert student profile into PostgreSQL
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: get('full_name'),
          roll_number: get('roll_number'),
          institute_email: get('institute_email'),
          personal_email: get('personal_email'),
          department: get('department'),
          programme: get('programme'),
          year_of_study: year,
        });

      if (insertError) {
        throw insertError;
      }

      // Notify parent that profile creation succeeded
      onComplete();

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save profile'
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card profile-card">

        <h1>DucKGP 🦆</h1>
        <h2>Complete Your Profile</h2>

        <p>
          Enter your student details to continue.
        </p>

        <form onSubmit={handleSubmit} className="profile-form">

          <label>Full Name</label>
          <input
            name="full_name"
            type="text"
            placeholder="Your full name"
            required
          />

          <label>Roll Number</label>
          <input
            name="roll_number"
            type="text"
            placeholder="Institute roll number"
            required
          />

          <label>Institute Email</label>
          <input
            name="institute_email"
            type="email"
            placeholder="Your IIT KGP email"
            required
          />

          <label>Personal Email</label>
          <input
            name="personal_email"
            type="email"
            placeholder="Your personal email"
            required
          />

          <label>Department</label>
          <input
            name="department"
            type="text"
            placeholder="Chemical Engineering"
            required
          />

          <label>Programme</label>
          <select name="programme" required defaultValue="">
            <option value="" disabled>
              Select programme
            </option>
            <option value="BTech">BTech</option>
            <option value="MTech">MTech</option>
            <option value="MSc">MSc</option>
            <option value="PhD">PhD</option>
            <option value="Other">Other</option>
          </select>

          <label>Year of Study</label>
          <input
            name="year_of_study"
            type="number"
            min="1"
            max="7"
            required
          />

          {error && (
            <p className="auth-error">{error}</p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Complete Registration'}
          </button>

        </form>
      </div>
    </div>
  );
}