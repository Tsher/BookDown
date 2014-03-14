#!/bin/bash
# Installer for GitLab on RHEL 6 (Red Hat Enterprise Linux and CentOS)
# mattias.ohlsson@inprose.com
#http://qiita.com/simota/items/c38335ccc626867203ca
#http://www.tatsuya-k.net/wp/?p=131
#backup gitlab https://github.com/gitlabhq/gitlabhq/blob/master/doc/raketasks/backup_restore.md
#gitlab update https://github.com/gitlabhq/gitlabhq/blob/master/CHANGELOG
#Gitlab and jenkins http://devsops.blogspot.com/2013/01/gitlab-jenkins-and-puppet-playing.html
#Gitlab update https://github.com/gitlabhq/gitlabhq/tree/master/doc/update
#Gitlab and CI how to use http://blog.bitnami.com/2013/05/deploy-gitlab-gitlab-ci-in-cloud-with.html
# how to use git http://nettedfish.sinaapp.com/blog/2013/08/05/deep-into-git-with-diagrams/

# Only run this on a clean machine. I take no responsibility for anything.
#
# Submit issues here: github.com/mattias-ohlsson/gitlab-installer

# Define the public hostname
export GL_HOSTNAME=$HOSTNAME


## Install epel-release
yum -y install http://dl.fedoraproject.org/pub/epel/6/i386/epel-release-6-8.noarch.rpm

# Ruby
## packages (from rvm install message):
yum -y install libicu-devel patch gcc-c++ readline-devel zlib-devel libffi-devel openssl-devel make autoconf automake libtool bison libxml2-devel libxslt-devel libyaml-devel

#update git version
yum -y remove git
yum -y install zlib-devel openssl-devel cpio expat-devel gettext-devel curl-devel perl-ExtUtils-CBuilder perl-ExtUtils-MakeMaker
cd /tmp
wget http://git-core.googlecode.com/files/git-1.8.3.4.tar.gz
tar -zxf git-1.8.3.4.tar.gz
cd git-1.8.3.4
make prefix=/usr all
make prefix=/usr install

##check the git version
git --version

## Install rvm (instructions from https://rvm.io)
curl -L get.rvm.io | bash -s stable

## Load RVM
source /etc/profile.d/rvm.sh
sed -i 's!ftp.ruby-lang.org/pub/ruby!ruby.taobao.org/mirrors/ruby!' /usr/local/rvm/config/db

## Fix for missing psych
## *It seems your ruby installation is missing psych (for YAML output).
## *To eliminate this warning, please install libyaml and reinstall your ruby.
## Run rvm pkg and add --with-libyaml-dir
rvm pkg install libyaml

## Gitlab 5.4 support ruby 2.0 you also can use 1.9Install Ruby (use command to force non-interactive mode)
#rvm install 1.9.3-p392 --with-libyaml-dir=/usr/local/rvm/usr
#rvm --default use 1.9.3-p392

rvm install 2.0.0-p247 --with-libyaml-dir=/usr/local/rvm/usr
rvm --default use 2.0.0-p247


#use taobao ruby for gem
gem sources --remove https://rubygems.org/
gem sources -a http://ruby.taobao.org/
gem sources -l
## Install core gems
#gem install bundler
gem install bundler --no-ri --no-rdoc

# Users

## Create a git user for Gitlab
adduser --system --create-home --comment 'GitLab' git

# GitLab Shell

## Clone gitlab-shell
su - git -c "git clone https://github.com/gitlabhq/gitlab-shell.git"
su - git -c "cd gitlab-shell;git checkout v1.7.0"

## Edit configuration
su - git -c "cp gitlab-shell/config.yml.example gitlab-shell/config.yml"

## Run setup
su - git -c "gitlab-shell/bin/install"


# Database

## Redis
yum -y install redis ;service redis start ; chkconfig redis on


## Mysql
yum install -y mysql-server mysql-devel ; chkconfig mysqld on ; service mysqld start


### Create the database
echo "CREATE DATABASE IF NOT EXISTS gitlabhq_production DEFAULT CHARACTER SET 'utf8' COLLATE 'utf8_unicode_ci';" | mysql -u root

#Setting mysql root password
MYSQL_ROOT_PW=admin

## Set MySQL root password in MySQL
echo "UPDATE mysql.user SET Password=PASSWORD('$MYSQL_ROOT_PW') WHERE User='root'; FLUSH PRIVILEGES;" | mysql -u root

# GitLab

## Clone GitLab
su - git -c "git clone https://github.com/gitlabhq/gitlabhq.git gitlab"

## Checkout
su - git -c "cd gitlab;git checkout 5-4-stable"

## Configure GitLab

cd /home/git/gitlab

### Copy the example GitLab config
su git -c "cp config/gitlab.yml.example config/gitlab.yml"

### Change gitlabhq hostname to GL_HOSTNAME
sed -i "s/  host: localhost/  host: $GL_HOSTNAME/g" config/gitlab.yml

### Change the from email address
sed -i "s/from: gitlab@localhost/from: gitlab@$GL_HOSTNAME/g" config/gitlab.yml


### Unicorn config for gitlab 5.0
#su git -c "cp config/unicorn.rb.example config/unicorn.rb"
### Listen on localhost:3000
#sed -i "s/^listen/#listen/g" /home/git/gitlab/config/unicorn.rb
#sed -i "s/#listen \"127.0.0.1:8080\"/listen \"127.0.0.1:3000\"/g" /home/git/gitlab/config/unicorn.rb

#Puma config for gitlab 5.3 and 5.4
su git -c "cp config/puma.rb.example config/puma.rb"
sed -i "s/0.0.0.0:9292/127.0.0.1:3000/g" /home/git/gitlab/config/puma.rb
sed -i "s/# bind/bind/g" /home/git/gitlab/config/puma.rb


#chage the folder right
su git -c "chown -R git /home/git/gitlab/log/;chmod -R u+rwx /home/git/gitlab/log/;chown -R git /home/git/gitlab/tmp/;chmod -R u+rwx /home/git/gitlab/tmp/;mkdir /home/git/gitlab-satellites;mkdir /home/git/gitlab/tmp/pids/;chmod -R u+rwx /home/git/gitlab/tmp/pids/;mkdir /home/git/gitlab/tmp/sockets/;chmod -R u+rwx /home/git/gitlab/tmp/sockets/;mkdir /home/git/gitlab/public/uploads;chmod -R u+rwX /home/git/gitlab/public/uploads"

### Copy database congiguration
su git -c "cp config/database.yml.mysql config/database.yml"

### Set MySQL root password in configuration file
sed -i "s/secure password/$MYSQL_ROOT_PW/g" config/database.yml

### Configure git user
su git -c 'git config --global user.name  "GitLab"'
su git -c 'git config --global user.email "gitlab@$GL_HOSTNAME"'

# Install Gems

## Install Charlock holmes
gem install charlock_holmes --version '0.6.9'



#let bundle use taobao source
sed -i '1s/https/http/g' /home/git/gitlab/Gemfile
sed -i '1s/rubygems/ruby.taobao/g' /home/git/gitlab/Gemfile
su git -c "bundle install --deployment --without development test postgres"

# Initialise Database and Activate Advanced Features
# Force it to be silent (issue 31)
export force=yes
su git -c "bundle exec rake gitlab:setup RAILS_ENV=production"

#check the status
su git -c "bundle exec rake gitlab:env:info RAILS_ENV=production"

## Install init script
curl --output /etc/init.d/gitlab https://raw.github.com/gitlabhq/gitlab-recipes/master/centos/init.d/gitlab-centos
chmod +x /etc/init.d/gitlab

## Fix for issue 30
# bundle not in path (edit init-script).
# Add after ". /etc/rc.d/init.d/functions" (row 17).
sed -i "17 a source /etc/profile.d/rvm.sh\nrvm use $RUBY_VERSION" /etc/init.d/gitlab

### Enable and start
chkconfig gitlab on
service gitlab start

# Apache

## Install
yum -y install httpd
chkconfig httpd on

## Configure
cat > /etc/httpd/conf.d/gitlab.conf << EOF
ProxyPass / http://127.0.0.1:3000/
ProxyPassReverse / http://127.0.0.1:3000/
ProxyPreserveHost On
EOF

### Configure SElinux
setsebool -P httpd_can_network_connect 1

## Start
service httpd start

#  Configure iptables

## Open port 80
iptables -I INPUT -p tcp -m tcp --dport 80 -j ACCEPT

## Save iptables
service iptables save


#check the status
su git -c "bundle exec rake gitlab:env:info RAILS_ENV=production"
su git -c "bundle exec rake gitlab:check RAILS_ENV=production"


echo "### Done ###############################################"
echo "#"
echo "# You have your MySQL root password in this file:"
echo "# /home/git/gitlab/config/database.yml"
echo "#"
echo "# Point your browser to:" 
echo "# http://$GL_HOSTNAME (or: http://<host-ip>)"
echo "# Default admin username: admin@local.host"
echo "# Default admin password: 5iveL!fe"
echo "#"
echo "# Flattr me if you like this! https://flattr.com/profile/mattiasohlsson"
echo "###"

