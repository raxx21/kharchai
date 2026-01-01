import fs from 'fs';
import path from 'path';

interface TestResult {
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

interface SuiteResult {
  title: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

interface TestReport {
  suites: SuiteResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    timestamp: string;
  };
}

function parseTestResults(): TestReport {
  const resultsPath = path.join(process.cwd(), 'test-results', 'test-results.json');

  if (!fs.existsSync(resultsPath)) {
    console.error('Test results file not found:', resultsPath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(resultsPath, 'utf-8');
  const data = JSON.parse(rawData);

  const suites: SuiteResult[] = [];
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let totalDuration = 0;

  // Parse Playwright test results
  for (const suite of data.suites || []) {
    const suiteResult: SuiteResult = {
      title: suite.title || suite.file?.split('/').pop() || 'Unknown Suite',
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    };

    // Parse specs within suite
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const result: TestResult = {
          title: spec.title,
          status: test.status === 'expected' ? 'passed' : test.status === 'skipped' ? 'skipped' : 'failed',
          duration: test.results?.[0]?.duration || 0,
          error: test.results?.[0]?.error?.message,
        };

        suiteResult.tests.push(result);
        suiteResult.duration += result.duration;

        if (result.status === 'passed') {
          suiteResult.passed++;
          totalPassed++;
        } else if (result.status === 'failed') {
          suiteResult.failed++;
          totalFailed++;
        } else {
          suiteResult.skipped++;
          totalSkipped++;
        }

        totalTests++;
        totalDuration += result.duration;
      }
    }

    if (suiteResult.tests.length > 0) {
      suites.push(suiteResult);
    }
  }

  return {
    suites,
    summary: {
      total: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
      duration: totalDuration,
      timestamp: new Date().toISOString(),
    },
  };
}

function generateHTMLReport(report: TestReport): string {
  const { summary, suites } = report;
  const passRate = summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(2) : '0';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KharchAI - E2E Test Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f5f5f5;
            color: #333;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 32px;
            margin-bottom: 10px;
        }

        .header p {
            opacity: 0.9;
            font-size: 14px;
        }

        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #fafafa;
        }

        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            text-align: center;
        }

        .summary-card h3 {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .summary-card .value {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .summary-card.total .value { color: #667eea; }
        .summary-card.passed .value { color: #10b981; }
        .summary-card.failed .value { color: #ef4444; }
        .summary-card.skipped .value { color: #f59e0b; }

        .pass-rate {
            font-size: 18px;
            color: ${parseFloat(passRate) >= 80 ? '#10b981' : parseFloat(passRate) >= 60 ? '#f59e0b' : '#ef4444'};
            font-weight: 600;
        }

        .suites {
            padding: 30px;
        }

        .suite {
            margin-bottom: 30px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            overflow: hidden;
        }

        .suite-header {
            background: #f9fafb;
            padding: 15px 20px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .suite-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
        }

        .suite-stats {
            display: flex;
            gap: 15px;
            font-size: 14px;
        }

        .suite-stats span {
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 500;
        }

        .suite-stats .passed {
            background: #d1fae5;
            color: #065f46;
        }

        .suite-stats .failed {
            background: #fee2e2;
            color: #991b1b;
        }

        .suite-stats .skipped {
            background: #fef3c7;
            color: #92400e;
        }

        .tests {
            list-style: none;
        }

        .test {
            padding: 15px 20px;
            border-bottom: 1px solid #f3f4f6;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .test:last-child {
            border-bottom: none;
        }

        .test-title {
            flex: 1;
            font-size: 14px;
            color: #374151;
        }

        .test-info {
            display: flex;
            gap: 15px;
            align-items: center;
        }

        .test-duration {
            font-size: 12px;
            color: #6b7280;
        }

        .test-status {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .test-status.passed {
            background: #d1fae5;
            color: #065f46;
        }

        .test-status.failed {
            background: #fee2e2;
            color: #991b1b;
        }

        .test-status.skipped {
            background: #fef3c7;
            color: #92400e;
        }

        .test-error {
            margin-top: 10px;
            padding: 10px;
            background: #fef2f2;
            border-left: 3px solid #ef4444;
            border-radius: 4px;
            font-size: 12px;
            color: #991b1b;
            font-family: 'Courier New', monospace;
            white-space: pre-wrap;
            word-break: break-word;
        }

        .footer {
            background: #f9fafb;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
        }

        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981, #059669);
            transition: width 0.3s ease;
        }

        @media print {
            body {
                padding: 0;
            }
            .container {
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 KharchAI Test Report</h1>
            <p>End-to-End Testing Results</p>
            <p style="font-size: 12px; margin-top: 10px;">Generated on ${new Date(summary.timestamp).toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="summary-card total">
                <h3>Total Tests</h3>
                <div class="value">${summary.total}</div>
            </div>
            <div class="summary-card passed">
                <h3>Passed</h3>
                <div class="value">${summary.passed}</div>
            </div>
            <div class="summary-card failed">
                <h3>Failed</h3>
                <div class="value">${summary.failed}</div>
            </div>
            <div class="summary-card skipped">
                <h3>Skipped</h3>
                <div class="value">${summary.skipped}</div>
            </div>
            <div class="summary-card">
                <h3>Duration</h3>
                <div class="value" style="font-size: 24px;">${(summary.duration / 1000).toFixed(2)}s</div>
            </div>
            <div class="summary-card">
                <h3>Pass Rate</h3>
                <div class="pass-rate">${passRate}%</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${passRate}%"></div>
                </div>
            </div>
        </div>

        <div class="suites">
            <h2 style="margin-bottom: 20px; color: #1f2937;">Test Suites</h2>
            ${suites.map(suite => `
                <div class="suite">
                    <div class="suite-header">
                        <div class="suite-title">${suite.title}</div>
                        <div class="suite-stats">
                            ${suite.passed > 0 ? `<span class="passed">✓ ${suite.passed}</span>` : ''}
                            ${suite.failed > 0 ? `<span class="failed">✗ ${suite.failed}</span>` : ''}
                            ${suite.skipped > 0 ? `<span class="skipped">⊘ ${suite.skipped}</span>` : ''}
                            <span>${(suite.duration / 1000).toFixed(2)}s</span>
                        </div>
                    </div>
                    <ul class="tests">
                        ${suite.tests.map(test => `
                            <li class="test">
                                <div style="flex: 1;">
                                    <div class="test-title">${test.title}</div>
                                    ${test.error ? `<div class="test-error">${test.error}</div>` : ''}
                                </div>
                                <div class="test-info">
                                    <span class="test-duration">${(test.duration / 1000).toFixed(2)}s</span>
                                    <span class="test-status ${test.status}">${test.status}</span>
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `).join('')}
        </div>

        <div class="footer">
            <p><strong>KharchAI</strong> - Automated End-to-End Testing</p>
            <p style="margin-top: 5px;">Powered by Playwright</p>
        </div>
    </div>
</body>
</html>
`;
}

function main() {
  console.log('📊 Generating test report...');

  try {
    const report = parseTestResults();
    const html = generateHTMLReport(report);

    const reportPath = path.join(process.cwd(), 'test-results', 'report.html');
    fs.writeFileSync(reportPath, html, 'utf-8');

    console.log('\n✅ Test report generated successfully!');
    console.log(`📁 Report location: ${reportPath}`);
    console.log('\n📈 Summary:');
    console.log(`   Total Tests: ${report.summary.total}`);
    console.log(`   ✓ Passed: ${report.summary.passed}`);
    console.log(`   ✗ Failed: ${report.summary.failed}`);
    console.log(`   ⊘ Skipped: ${report.summary.skipped}`);
    console.log(`   ⏱  Duration: ${(report.summary.duration / 1000).toFixed(2)}s`);

    const passRate = report.summary.total > 0
      ? ((report.summary.passed / report.summary.total) * 100).toFixed(2)
      : '0';
    console.log(`   📊 Pass Rate: ${passRate}%`);

    if (report.summary.failed > 0) {
      console.log('\n❌ Some tests failed. Check the report for details.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
    }
  } catch (error) {
    console.error('❌ Error generating report:', error);
    process.exit(1);
  }
}

main();
