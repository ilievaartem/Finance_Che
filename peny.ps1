# Список API посилань для запиту
$ApiUrls = @(
    "http://api.spending.gov.ua/api/v2/disposers/peny?disposerId=45905639",
    "http://api.spending.gov.ua/api/v2/disposers/peny?disposerId=04014252",
    "http://api.spending.gov.ua/api/v2/disposers/peny?disposerId=26184291",
    "http://api.spending.gov.ua/api/v2/disposers/peny?disposerId=03494540",
    "http://api.spending.gov.ua/api/v2/disposers/peny?disposerId=39300801",
    "http://api.spending.gov.ua/api/v2/disposers/peny?disposerId=39301117",
    "http://api.spending.gov.ua/api/v2/disposers/peny?disposerId=37240220",
    "http://api.spending.gov.ua/api/v2/disposers/peny?disposerId=40618131",
    "http://api.spending.gov.ua/api/v2/disposers/peny?disposerId=45159978",
    "http://api.spending.gov.ua/api/v2/disposers/peny?disposerId=38536252",
    "http://api.spending.gov.ua/api/v2/disposers/peny?disposerId=44110123",
    "http://api.spending.gov.ua/api/v2/disposers/peny?disposerId=43470010",
    "http://api.spending.gov.ua/api/v2/disposers/peny?disposerId=39302152",
    "http://api.spending.gov.ua/api/v2/disposers/peny?disposerId=39301337",
    "http://api.spending.gov.ua/api/v2/disposers/peny?disposerId=38345436",
    "http://api.spending.gov.ua/api/v2/disposers/peny?disposerId=41601843",
    "http://api.spending.gov.ua/api/v2/disposers/peny?disposerId=02317304",
    "http://api.spending.gov.ua/api/v2/disposers/peny?disposerId=00022680",
    "http://api.spending.gov.ua/api/v2/disposers/peny?disposerId=45048943",
    "http://api.spending.gov.ua/api/v2/disposers/peny?disposerId=45776308"
)

# Шляхи до вихідних файлів
$JsonOutputFile = "CombinedApiDataPeny.json"
$JsOutputFile = "CombinedApiDataPeny.js"

# Масив для зберігання всього зібраного вмісту (content)
$AllContent = @()

# Лічильник для прогрес-бару та відстеження оброблених посилань
$TotalUrls = $ApiUrls.Count
$Counter = 0

Write-Host "📜 Початок збору даних з API. Всього посилань: $TotalUrls" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------------"

# Цикл по кожному посиланню
foreach ($Url in $ApiUrls) {
    $Counter++
    
    # Використовуємо Write-Progress для інтуїтивного відображення прогресу
    Write-Progress -Activity "Збір даних з API" -Status "Обробка посилання $Counter з $TotalUrls..." -PercentComplete (($Counter / $TotalUrls) * 100) -CurrentOperation $Url
    
    # Витягуємо EDRPOU або коротку частину для кращої візуалізації
    $ShortUrl = $Url.Substring($Url.LastIndexOf('/') + 1)
    
    try {
        # Виконання GET-запиту та автоматична конвертація JSON у об'єкт PowerShell
        $Response = Invoke-RestMethod -Uri $Url -Method Get -ContentType "application/json" -ErrorAction Stop

        # Перевірка: додавати, якщо content не порожній (totalElements > 0)
        if ($Response.totalElements -gt 0 -and $Response.content) {
            $FoundElements = $Response.totalElements
            # Відображення успіху
            Write-Host "✅ [$Counter/$TotalUrls] EDRPOU ($ShortUrl): Успіх. Знайдено $FoundElements елементів." -ForegroundColor Green
            # Додаємо вміст (масив content) до загального масиву
            $AllContent += $Response.content
        } else {
            # Відображення пропуску
            Write-Host "➖ [$Counter/$TotalUrls] EDRPOU ($ShortUrl): Пропущено. Даних немає (totalElements: 0)." -ForegroundColor DarkYellow
        }
    }
    catch {
        # Відображення помилки
        $ErrorMessage = $_.Exception.Message.Split([Environment]::NewLine)[0] # Беремо лише перший рядок помилки
        Write-Host "❌ [$Counter/$TotalUrls] EDRPOU ($ShortUrl): Помилка запиту. ($ErrorMessage)" -ForegroundColor Red
        # Продовжуємо з наступним посиланням
        continue
    }
}

# Приховуємо прогрес-бар після завершення циклу
Write-Progress -Activity "Збір даних з API" -Status "Завершено." -Completed

Write-Host "----------------------------------------------------------------------"
Write-Host "📊 Звіт про обробку:" -ForegroundColor Cyan
Write-Host "  ✅ Успішно зібрано: $($AllContent.Count) записів." -ForegroundColor Green
Write-Host "  📜 Обробка всіх $TotalUrls посилань завершена." -ForegroundColor Cyan
Write-Host "----------------------------------------------------------------------"

## 1. Генерація JSON файлу

Write-Host "💾 1/2. Конвертація в JSON-файл..." -ForegroundColor Cyan
$JsonContent = $AllContent | ConvertTo-Json -Depth 10
$JsonContent | Set-Content -Path $JsonOutputFile -Encoding UTF8
Write-Host "   ✅ Збережено: $JsonOutputFile" -ForegroundColor DarkGreen

## 2. Генерація JavaScript файлу

Write-Host "💾 2/2. Генерація JS-файлу (експорт як змінна)..." -ForegroundColor Cyan
$JsVariable = "const combinedApiData = "
$JsContent = $JsVariable + $JsonContent + ";"
$JsContent | Set-Content -Path $JsOutputFile -Encoding UTF8
Write-Host "   ✅ Збережено: $JsOutputFile" -ForegroundColor DarkGreen
Write-Host "   (Дані доступні у JS через змінну 'combinedApiData')" -ForegroundColor Gray

Write-Host "----------------------------------------------------------------------"
Write-Host "🎉 Завершено! У папці створено два файли." -ForegroundColor Yellow