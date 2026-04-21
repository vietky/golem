package training

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"strings"
)

type S3Storage struct {
	client *s3.Client
	bucket string
	prefix string
}

func NewS3Storage(ctx context.Context, endpoint, region, accessKey, secretKey, bucket, prefix string) (*S3Storage, error) {
	if bucket == "" {
		return nil, fmt.Errorf("bucket name is required")
	}

	var cfg aws.Config
	var err error

	if accessKey != "" && secretKey != "" {
		customProvider := aws.NewCredentialsCache(credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""))
		customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
			if endpoint != "" {
				return aws.Endpoint{
					PartitionID:   "aws",
					URL:           endpoint,
					SigningRegion: region,
				}, nil
			}
			return aws.Endpoint{}, &aws.EndpointNotFoundError{}
		})

		cfg, err = config.LoadDefaultConfig(ctx,
			config.WithRegion(region),
			config.WithEndpointResolverWithOptions(customResolver),
			config.WithCredentialsProvider(customProvider),
		)
	} else {
		// Use default environment credentials
		cfg, err = config.LoadDefaultConfig(ctx, config.WithRegion(region))
	}

	if err != nil {
		return nil, fmt.Errorf("unable to load SDK config: %v", err)
	}

	client := s3.NewFromConfig(cfg)

	return &S3Storage{
		client: client,
		bucket: bucket,
		prefix: prefix,
	}, nil
}

func (s *S3Storage) Upload(ctx context.Context, data []byte, filename string) error {
	key := filename
	if s.prefix != "" {
		key = fmt.Sprintf("%s/%s", strings.TrimSuffix(s.prefix, "/"), filename)
	}

	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        strings.NewReader(string(data)),
		ContentType: aws.String("application/json"),
	})

	if err != nil {
		return fmt.Errorf("failed to upload object to S3: %v", err)
	}

	return nil
}
