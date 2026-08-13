import { createRouter, createWebHistory } from 'vue-router';
import { fetchLocations } from '../api/location/location-api';
import MainLayout from '../layouts/MainLayout.vue';
import ChatView from '../views/chat/ChatView.vue';
import ExportView from '../views/data-transfer/ExportView.vue';
import HousesView from '../views/houses/HousesView.vue';
import ImportView from '../views/data-transfer/ImportView.vue';
import LocationsView from '../views/locations/LocationsView.vue';
import ScheduleView from '../views/schedule/ScheduleView.vue';
import ScheduleCalendarView from '../views/schedule/ScheduleCalendarView.vue';
import StatsView from '../views/stats/StatsView.vue';
import HelpPage from '../views/help/HelpPage.vue';
import SettingsView from '../views/settings/SettingsView.vue';
import WelcomePage from '../views/welcome/WelcomePage.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: MainLayout,
    redirect: { name: 'houses' },
    children: [
      {
        path: 'houses',
        name: 'houses',
        component: HousesView
      },
      {
        path: 'locations',
        name: 'locations',
        component: LocationsView
      },
      {
        path: 'chat',
        name: 'chat',
        component: ChatView
      },
      {
        path: 'schedule',
        name: 'schedule',
        component: ScheduleView
      }
    ]
  },
  {
    path: '/welcome',
    name: 'welcome',
    component: WelcomePage
  },
  {
    path: '/help',
    name: 'help',
    component: HelpPage
  },
  {
    path: '/stats',
    name: 'stats',
    component: StatsView
  },
  {
    path: '/export',
    name: 'export',
    component: ExportView
  },
  {
    path: '/import',
    name: 'import',
    component: ImportView
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView
  },
  {
    path: '/schedule-calendar',
    name: 'schedule-calendar',
    component: ScheduleCalendarView
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

async function hasFocusLocation(): Promise<boolean> {
  try {
    const locations = await fetchLocations({ category: '' });
    return locations.some((loc) => loc.isFocus);
  } catch {
    return false;
  }
}

router.beforeEach(async (to) => {
  const hasFocus = await hasFocusLocation();
  const importedFromWelcome = sessionStorage.getItem('find-my-house-welcome-imported') === 'true';

  if (hasFocus && to.name === 'welcome') {
    return { name: 'home' };
  }

  if (!hasFocus && importedFromWelcome && to.name !== 'welcome') {
    return;
  }

  if (
    !hasFocus &&
    to.name !== 'welcome' &&
    to.name !== 'settings' &&
    to.name !== 'help' &&
    to.name !== 'stats' &&
    to.name !== 'export' &&
    to.name !== 'import' &&
    to.name !== 'schedule-calendar'
  ) {
    return { name: 'welcome' };
  }
});

export default router;
