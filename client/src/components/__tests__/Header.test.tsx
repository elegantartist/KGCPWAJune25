import React from 'react';
import { render } from '@testing-library/react';
import Header from '../patient/dashboard/Header';

test('renders Header component', () => {
  render(<Header isMenuOpen={false} setIsMenuOpen={() => {}} logout={() => {}} />);
});
