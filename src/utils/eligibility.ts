export const checkEligibility = (dateStr?: string) => {
  if (!dateStr) return true;
  if (dateStr === 'less_than_3_months') return false;
  if (dateStr === '3_to_6_months' || dateStr === 'more_than_6_months') return true;
  
  const lastDonation = new Date(dateStr);
  if (isNaN(lastDonation.getTime())) return true; // fallback if invalid date
  
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return lastDonation < threeMonthsAgo;
};
