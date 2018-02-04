# unddich

自分のTwitterアカウントのTLを公開してツイート欄まで公なものにする

## config

Put config.yml

```bash
cat <<EOM > config.yml
port: 80
twitter:
    username: unddich
    consumer_key: CjxxxxxxxxxxxxxxxxxCg
    consumer_secret: VyqxxxxxxxFxghAtURxxxxxxxxxxxxxxxxxkIQWd
    access_token_key: 3117017022-xxxxkqxxxxxxxxxxxxxxxxxxxxxxxxxxx5tHZ4J
    access_token_secret: YxxxxxxxxxxxxxxxxxBKPM2MxxxxxxxxxxxxxxxxxLmpW
EOM
```

## run

```bash
$ npm install
$ sudo node server.js  (sudo if port=80)
```
