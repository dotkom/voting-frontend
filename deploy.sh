#!/bin/sh
#
FRONTEND_S3_BUCKET=$(doppler run --command 'echo $FRONTEND_S3_BUCKET')
CLOUDFRONT_DISTRIBUTION_ID=$(doppler run --command 'echo $CLOUDFRONT_DISTRIBUTION_ID')

NODE_OPTIONS=--openssl-legacy-provider doppler run yarn build &&
aws s3 rm $FRONTEND_S3_BUCKET --recursive &&
aws s3 cp build $FRONTEND_S3_BUCKET --recursive &&
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths  '/*'
