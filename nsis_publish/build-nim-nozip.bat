@call makensiscode.bat

@call makeskinzip.bat nim

".\NSIS\makensis.exe" /DINSTALL_WITH_NO_NSIS7Z=1 ".\SetupScripts\nim\nim_setup.nsi"

@rem ���Ҫ���Դ�����ʹ������Ľű���������򿪱�����棨�����н������Ļ���ʾ��?�ţ�
@rem ".\NSIS\makensisw.exe" /DINSTALL_WITH_NO_NSIS7Z=1 ".\SetupScripts\nim\nim_setup.nsi"
@pause