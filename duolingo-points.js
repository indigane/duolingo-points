const jwtToken = document.cookie.split('jwt_token=').pop().split(';').shift();
const userId = JSON.parse(atob(jwtToken.split('.')[1])).sub;
const headers = {'Authorization': `Bearer ${jwtToken}`};
// Based on old goal in the app itself
const targetAmountPerMonth = 1000;

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
      --scaling: 1.75;
      position: relative;
      width: calc(100vw * var(--scaling));
      max-width: calc(800px * var(--scaling));
      aspect-ratio: 4 / 3;
      transform: scale(calc(1 / var(--scaling)));
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
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const firstDayOfMonthIsoStr = `${year}-${month.toString().padStart(2, '0')}-01`;
  // This works because month is zero-based in JS and 0 as day gives the last day of the previous month
  const daysInThisMonth = new Date(year, month, 0).getDate();
  const response = await fetch(`https://www.duolingo.com/2017-06-30/users/${userId}/xp_summaries?startDate=${firstDayOfMonthIsoStr}`, {headers});
  const data = await response.json();
  const days = [];
  const xpPerDay = [0];
  const xpPerDayCumulative = [0];
  data.summaries.reverse();
  for (const summary of data.summaries) {
    const previousDayXp = xpPerDayCumulative.at(-1) || 0;
    const currentDayXp = previousDayXp + summary.gainedXp;
    xpPerDay.push(summary.gainedXp);
    xpPerDayCumulative.push(currentDayXp);
    const summaryDay = parseInt(new Date(summary.date * 1000).toISOString().split('T').shift().split('-').pop());
    days.push(summaryDay);
  }
  // Pad the x-axis to the end of the month
  for (dayIndex = 0; dayIndex < daysInThisMonth; dayIndex++) {
    if (days[dayIndex] === undefined) {
      days.push(dayIndex + 1);
    }
  }
  // Add "zeroth" day so that the line starts nicely from the origin
  days.unshift('');
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
          min: 0,
        },
        x: {},
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
              yMin: targetAmountPerMonth,
              yMax: targetAmountPerMonth,
              borderColor: 'rgb(255, 99, 132)',
              borderWidth: 2,
              drawTime: 'beforeDraw',
            },
            line2: {
              type: 'line',
              yMin: 0,
              yMax: targetAmountPerMonth,
              borderColor: 'rgba(255, 255, 255, 0.2)',
              borderWidth: 2,
              borderDash: [5, 15],
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
