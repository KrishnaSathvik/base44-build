import { render,screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect,test } from 'vitest';
import { DemoPage } from '@/pages/DemoPage';
test('demo distinguishes representative state from live behavior',()=>{render(<MemoryRouter><DemoPage/></MemoryRouter>);expect(screen.getAllByText('Representative demo state').length).toBeGreaterThan(0);expect(screen.getByText('Live product behavior')).toBeInTheDocument();expect(screen.getByText(/no email delivery/i)).toBeInTheDocument();});
