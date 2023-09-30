const jwtToken = document.cookie.split('jwt_token=').pop().split(';').shift();
const userId = JSON.parse(atob(jwtToken.split('.')[1])).sub;
const headers = {'Authorization': `Bearer ${jwtToken}`};

function addScript(url) {
  const scriptElement = document.createElement('script');
  scriptElement.setAttribute('src', url);
  document.head.appendChild(scriptElement);
  return new Promise((resolve, reject) => {
    scriptElement.addEventListener('load', resolve);
    scriptElement.addEventListener('error', reject);
  });
}

async function initPage() {
  await addScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js');
  await addScript('https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js');
  await addScript('https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0');
  Chart.register(ChartDataLabels);
  Chart.defaults.font.family = '"din-round", Helvetica, Arial, Verdana, sans-serif';
  Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
  Chart.defaults.color = '#999';
  var styles = `
    html, body {
      background: #131f24;
    }
    .chart-container {
      position: relative;
      width: 100%;
      max-width: 800px;
      aspect-ratio: 4 / 3;
    }
  `;
  const styleSheet = document.createElement('style');
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
  const container = document.querySelector('#container');
  container.innerHTML = `
    <div class="chart-container">
      <canvas id="monthly-chart">
    </div>
  `;
}

async function initMonthlyChart() {
  const today = new Date();
  const firstDayOfMonthIsoStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-01`;
  const response = await fetch(`https://www.duolingo.com/2017-06-30/users/${userId}/xp_summaries?startDate=${firstDayOfMonthIsoStr}`, {headers});
  const data = await response.json();
  const days = [];
  const xpPerDay = [];
  const xpPerDayCumulative = [];
  data.summaries.reverse();
  for (const summary of data.summaries) {
    const previousDayXp = xpPerDayCumulative.at(-1) || 0;
    const currentDayXp = previousDayXp + summary.gainedXp;
    xpPerDay.push(summary.gainedXp);
    xpPerDayCumulative.push(currentDayXp);
    const summaryDay = parseInt(new Date(summary.date * 1000).toISOString().split('T').shift().split('-').pop());
    days.push(summaryDay);
  }
  const monthlyChartCanvas = document.querySelector('#monthly-chart');
  new Chart(monthlyChartCanvas, {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: 'Monthly XP progress',
        data: xpPerDayCumulative,
        fill: true,
        borderColor: 'rgb(120, 200, 0)',
        backgroundColor: 'rgba(120, 200, 0, .3)',
        cubicInterpolationMode: 'monotone',
      }],
    },
    options: {
      aspectRatio: 4 / 3,
      layout: {
        padding: 20,
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        // XP goal line
        annotation: {
          annotations: {
            line1: {
              type: 'line',
              yMin: 1000,
              yMax: 1000,
              borderColor: 'rgb(255, 99, 132)',
              borderWidth: 2,
              drawTime: 'beforeDraw',
            },
          },
        },
        // XP gained labels on data points
        datalabels: {
          color: 'rgb(120, 200, 0)',
          font: {
            weight: 'bold',
          },
          textStrokeWidth: 4,
          textStrokeColor: '#131f24',
          align: 'end',
          anchor: 'end',
          formatter: (_value, context) => `+${xpPerDay[context.dataIndex]}`,
        },
      },
    },
  });
}

(async () => {
  await initPage();
  initMonthlyChart();
})();
