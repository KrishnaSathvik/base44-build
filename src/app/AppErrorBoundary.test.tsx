import { render,screen } from '@testing-library/react';
import { expect,test,vi } from 'vitest';
import { AppErrorBoundary } from '@/app/AppErrorBoundary';
function Broken():never{throw new Error('private internal detail');}
test('error boundary exposes a safe recovery screen without internal details',()=>{vi.spyOn(console,'error').mockImplementation(()=>undefined);render(<AppErrorBoundary><Broken/></AppErrorBoundary>);expect(screen.getByRole('heading',{name:/could not open/i})).toBeInTheDocument();expect(screen.queryByText(/private internal detail/i)).not.toBeInTheDocument();expect(screen.getByRole('button',{name:/reload safely/i})).toBeInTheDocument();});
