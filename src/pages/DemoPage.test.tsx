import { render,screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect,test } from 'vitest';
import { DemoPage } from '@/pages/DemoPage';
test('VensaOS demo distinguishes representative state from live behavior',()=>{render(<MemoryRouter><DemoPage/></MemoryRouter>);expect(screen.getByText('VensaOS Demo')).toBeVisible();expect(screen.getByRole('heading',{name:'See how VensaOS turns related reports into one evidence-backed issue.'})).toBeVisible();expect(screen.getAllByText('Representative demo state').length).toBeGreaterThan(0);expect(screen.getByText('Live product behavior')).toBeInTheDocument();expect(screen.getByText(/no email delivery/i)).toBeInTheDocument();expect(screen.getByText(/TrailVerse Demo/)).toBeVisible();});
