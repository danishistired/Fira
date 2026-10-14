from flask import Flask, request, jsonify
from flask_cors import CORS

try:
    from androguard.core.bytecodes.apk import APK
except ImportError:
    from androguard.core.apk import APK
import tempfile
import os

app = Flask(__name__)
CORS(app)

# Simple high-risk permission set for scoring
HIGH_RISK_PERMISSIONS = {
    "android.permission.SEND_SMS",
    "android.permission.RECEIVE_SMS",
    "android.permission.READ_SMS",
    "android.permission.WRITE_SMS",
    "android.permission.RECORD_AUDIO",
    "android.permission.CAMERA",
    "android.permission.READ_CONTACTS",
    "android.permission.WRITE_CONTACTS",
    "android.permission.READ_CALL_LOG",
    "android.permission.WRITE_CALL_LOG",
    "android.permission.CALL_PHONE",
    "android.permission.WRITE_EXTERNAL_STORAGE",
    "android.permission.READ_EXTERNAL_STORAGE",
}

@app.route('/analyze', methods=['POST'])
def analyze_apk():
    if 'file' not in request.files:
        return jsonify({'error': 'no file provided'}), 400
    f = request.files['file']
    if f.filename == '':
        return jsonify({'error': 'empty filename'}), 400

    tmp_fd, tmp_path = tempfile.mkstemp(suffix='.apk')
    os.close(tmp_fd)
    try:
        f.save(tmp_path)
        apk = APK(tmp_path)
        permissions = apk.get_permissions() or []
        used_high_risk = [p for p in permissions if p in HIGH_RISK_PERMISSIONS]
        # Simple scoring: proportion of high-risk permissions (0-100)
        score = 0
        if permissions:
            score = round(len(used_high_risk) / len(permissions) * 100, 2)
        result = {
            'package': apk.get_package(),
            'permissions': permissions,
            'high_risk_permissions': used_high_risk,
            'permission_score_percent': score,
        }
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
