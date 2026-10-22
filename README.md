# EMVision 배포

EMVision 판매용 실행 파일을 제공하는 배포 전용 저장소입니다.

[최신 버전 다운로드](https://github.com/Rubiya82/EMVision-Releases/releases/latest)

## v2.2.4

- Windows x64: `EMVision-win-x64-2.2.4-licensed.zip`
- Linux x86_64 헤드리스: `EMVision-linux-x86_64-2.2.4-licensed.tar.gz`
- 파일 무결성 확인: `SHA256SUMS.txt`
- 빌드 기준과 옵션: `build-info.json`

압축 파일에 한국어 사용자 매뉴얼과 설치 안내가 포함되어 있습니다.

## 인증

Windows에서는 **설정 > 라이선스 인증 > 기기 정보 파일 저장**으로 `.emvreq`를 생성해 판매처에 전달하고, 발급받은 `.emvlic`를 **인증 파일 선택**에서 설치합니다.

Linux에서는 `./emv_pi req device.emvreq`로 기기 정보를 생성하고, `./emv_pi install customer.emvlic`로 인증 파일을 설치합니다. 상태는 `./emv_pi status`로 확인합니다.

인증 전에는 씬 편집·저장이 제한되며 계측은 계속됩니다. 인증 파일은 발급받은 기기에서 사용합니다.

## 실행 환경

Windows는 MFC/Visual C++ x64 런타임이 필요합니다. Linux는 `libfreetype6`, `fonts-noto-cjk`가 필요합니다. Linux 패키지는 x86_64용이며 라즈베리파이 ARM에서는 실행할 수 없습니다.

이 배포본에는 ONNX 런타임과 모델이 포함되어 있지 않습니다. Android 판매용 빌드는 이 릴리즈에 포함되지 않습니다.

프로그램과 함께 제공되는 제3자 라이브러리 고지는 패키지의 `NOTICE.txt`와 `licenses/`를 확인해 주세요. 이 저장소에는 제품 소스 코드와 라이선스 발급 도구를 포함하지 않습니다.
