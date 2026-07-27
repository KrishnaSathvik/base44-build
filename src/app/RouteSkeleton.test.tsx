import { render } from '@testing-library/react';
import { expect,test } from 'vitest';
import { OwnerRouteSkeleton,PublicRouteSkeleton } from '@/app/RouteSkeleton';
test('lazy routes use route-appropriate public and owner fallbacks',()=>{const publicView=render(<PublicRouteSkeleton/>);expect(publicView.container.firstElementChild).toHaveClass('max-w-3xl');publicView.unmount();const ownerView=render(<OwnerRouteSkeleton/>);expect(ownerView.container.firstElementChild).toHaveClass('md:pl-[228px]');});
