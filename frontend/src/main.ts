import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'github-markdown-css/github-markdown-light.css';
import ElementPlusX from 'vue-element-plus-x';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import 'dayjs/locale/zh-cn';
import router from './router';
import App from './App.vue';
import './styles.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(ElementPlus, { locale: zhCn });
app.use(ElementPlusX);
app.mount('#app');
