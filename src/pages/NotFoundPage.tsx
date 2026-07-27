import { Link } from 'react-router-dom';
import { Button, EmptyState } from '@/components/ui';
import { BrandMark } from '@/components/Brand';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-lg"><EmptyState icon={<BrandMark className="h-5 w-5" />} title="Page not found" description="The address does not point to a VensaOS page." action={<Link to="/"><Button variant="secondary">Back to home</Button></Link>} /></div>
    </div>
  );
}
