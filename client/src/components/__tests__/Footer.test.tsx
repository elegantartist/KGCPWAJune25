import React from 'react';
import { render } from '@testing-library/react';
import Footer from '../patient/dashboard/Footer';

test('renders Footer component', () => {
  render(<Footer setShowKeepGoing={() => {}} setShowDailyScores={() => {}} setShowChat={() => {}} />);
});
