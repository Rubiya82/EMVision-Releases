# EMVision 배포

EMVision 판매용 실행 파일을 제공하는 배포 전용 저장소입니다.

[최신 버전 다운로드](https://github.com/Rubiya82/EMVision-Releases/releases/latest)

## 배포 파일

- Windows x64: `EMVision-win-x64-<버전>-licensed.zip`
- Linux x86_64 헤드리스: `EMVision-linux-x86_64-<버전>-licensed.tar.gz`
- 한국어 사용자 매뉴얼: `EMVision_UserManual_ko-<버전>.pdf`
- 파일 무결성 확인: `SHA256SUMS.txt`
- 빌드 기준과 옵션: `build-info.json`
- `EMVision-update-<버전>-win-x64.zip`: 프로그램의 자동 업데이트가 받는 교체용 패키지(`EMVision.exe` 하나)입니다. **직접 받을 필요가 없습니다** — 설치할 때는 위의 `-licensed.zip` 을 받으세요.

압축 파일에 한국어 사용자 매뉴얼과 설치 안내가 포함되어 있습니다.

## 인증

Windows에서는 **설정 > 라이선스 인증 > 기기 정보 파일 저장**으로 `.emvreq`를 생성해 판매처에 전달하고, 발급받은 `.emvlic`를 **인증 파일 선택**에서 설치합니다.

Linux에서는 `./emv_pi req device.emvreq`로 기기 정보를 생성하고, `./emv_pi install customer.emvlic`로 인증 파일을 설치합니다. 상태는 `./emv_pi status`로 확인합니다.

v2.2.18 부터 인증 파일이 없으면 프로그램이 시작하지 않고 인증 창만 표시됩니다(Linux 헤드리스와 Windows `/headless` 는 웹 주소에 인증 전용 화면). 인증을 마치면 바로 시작합니다. 인증 파일은 발급받은 기기에서 사용합니다.

## 업데이트

v2.2.19 부터 **설정 > 소프트웨어 업데이트**에서 새 버전을 확인하고 받을 수 있습니다(Windows). 새 버전은 알려 주기만 하고, 받기와 적용은 사용자가 누를 때만 합니다. 받은 파일은 배포자 서명·크기·SHA-256 을 확인하며, 새 버전이 시작되지 않으면 이전 버전으로 되돌립니다. 확인을 끄려면 같은 화면의 체크를 해제하거나 `EMVision.ini` 의 `[Update] AutoCheck=0` 을 씁니다. v2.2.18 이하는 이번 한 번 ZIP 을 직접 받아 덮어쓰세요.

## 실행 환경

Windows는 MFC/Visual C++ x64 런타임이 필요합니다. Linux는 `libfreetype6`, `fonts-noto-cjk`가 필요합니다. Linux 패키지는 x86_64용이며 라즈베리파이 ARM에서는 실행할 수 없습니다.

이 배포본에는 ONNX 런타임과 모델이 포함되어 있지 않습니다. Android 판매용 빌드는 이 릴리즈에 포함되지 않습니다.

프로그램과 함께 제공되는 제3자 라이브러리 고지는 패키지의 `NOTICE.txt`와 `licenses/`를 확인해 주세요. 이 저장소에는 제품 소스 코드와 라이선스 발급 도구를 포함하지 않습니다.
