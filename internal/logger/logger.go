package logger

import (
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// Logger wraps zap.Logger for dependency injection
type Logger struct {
	*zap.Logger
}

// NewLogger creates a new logger instance
func NewLogger(development bool) (*Logger, error) {
	var config zap.Config

	if development {
		config = zap.NewDevelopmentConfig()
		config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	} else {
		config = zap.NewProductionConfig()
	}

	zapLogger, err := config.Build()
	if err != nil {
		return nil, err
	}

	return &Logger{Logger: zapLogger}, nil
}

// NewNopLogger creates a no-op logger for testing
func NewNopLogger() *Logger {
	return &Logger{Logger: zap.NewNop()}
}

// With creates a child logger with additional fields
func (l *Logger) With(fields ...zap.Field) *Logger {
	return &Logger{Logger: l.Logger.With(fields...)}
}

// Sync flushes any buffered log entries
func (l *Logger) Sync() error {
	return l.Logger.Sync()
}
