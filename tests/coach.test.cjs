// The home coachmark highlights a home-screen card (.mainpick, coach.js step 1).
// It must start only while the home screen is still open: finishOnboarding fires
// it on a 350ms timer, and a user who navigates away immediately must not see
// the home tutorial over another page.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=file=>fs.readFileSync(file,'utf8');

test('the home coach starts only while the home screen is open',()=>{
  const call=read('pinmap.js').match(/if \(onboardFull\) setTimeout\(([^;]*)\);/);
  assert(call,'finishOnboarding schedules startCoach on a timer');
  assert(call[1].includes("page === 'home'"),'the 350ms callback re-checks page === home before starting the coach');
  assert(call[1].includes('startCoach'),'the callback still starts the coach');
});

test('coach step 1 points at a home screen element, not a global overlay',()=>{
  const step=read('coach.js').match(/\{sel:'([^']+)'[^}]*관심사 추천 콘텐츠/);
  assert(step,'first coach step selector');
  assert(step[1].includes('.mainpick'),'coach step 1 targets the home pick card');
});
