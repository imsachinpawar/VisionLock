import speech_recognition as sr

def capture_voice_username():
    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        print("Listening for username...")
        audio = recognizer.listen(source, timeout=5)
        try:
            return recognizer.recognize_google(audio)
        except sr.UnknownValueError:
            return "Could not understand"
        except sr.RequestError:
            return "Speech recognition failed"
